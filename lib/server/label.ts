import { createServiceClient } from '@/lib/supabase/service'
import {
  addToCart,
  calculateShipping,
  checkoutCart,
  generateLabel,
  getTrackingCode,
  type MEAddress,
  type MECartProduct,
  type MEShippingItem,
  type MEVolume,
} from '@/lib/integrations/melhor-envio'
import { meDocumentFields, onlyDigits } from '@/lib/documento'
import { getShippingOrigin, type ShippingOrigin } from '@/lib/server/store-identity'

/** Uma transportadora que atende o trecho do pedido agora, com o preço de agora. */
export type OpcaoFretePedido = {
  serviceId: number
  company: string
  name: string
  price: number
  prazoMin: number
  prazoMax: number
}

export type CotacaoPedido = {
  /** "Muriaé/MG" — origem da loja, para a mensagem dizer qual trecho falhou */
  origem: string
  destino: string
  opcoes: OpcaoFretePedido[]
}

/**
 * A transportadora escolhida no checkout não serve mais para este pedido.
 *
 * Carrega as alternativas junto porque é a única informação que resolve o
 * problema: sem ela o painel só sabe dizer que falhou, e o pacote não sai.
 */
export class TransportadoraIndisponivelError extends Error {
  readonly alternativas: OpcaoFretePedido[]

  constructor(message: string, alternativas: OpcaoFretePedido[]) {
    super(message)
    this.name = 'TransportadoraIndisponivelError'
    this.alternativas = alternativas
  }
}

/**
 * Remetente da etiqueta: de onde a mercadoria sai.
 *
 * Não é o endereço fiscal. Quem resolve a origem é getShippingOrigin(), a mesma
 * função que a cotação do carrinho usa — antes esta função lia STORE_CEP_ORIGEM
 * e a cotação lia store_settings.origin_cep, então mudar o CEP na tela fazia o
 * cliente ser cotado de um endereço e a coleta ser agendada em outro.
 */
export async function buildStoreAddress(origemResolvida?: ShippingOrigin): Promise<MEAddress> {
  const origem = origemResolvida ?? (await getShippingOrigin())

  return {
    name: origem.name,
    phone: origem.phone,
    email: origem.email,
    // A loja é PJ: o CNPJ é o documento que identifica o remetente. Documento que
    // não passa no dígito é omitido — o ME recusa o pedido inteiro com 422.
    ...meDocumentFields(origem.cnpj),
    address: origem.endereco.street,
    number: origem.endereco.number,
    complement: origem.endereco.complement,
    district: origem.endereco.district,
    city: origem.endereco.city,
    state_abbr: origem.endereco.state,
    postal_code: onlyDigits(origem.endereco.zip),
    country_id: 'BR',
  }
}

async function fetchOrderForLabel(orderId: string) {
  const supabase = createServiceClient()

  const { data: rawOrder } = await supabase
    .from('orders')
    .select(`
      id, total_amount, melhor_envio_service_id,
      buyer_name, buyer_email, buyer_phone, buyer_cpf_cnpj, buyer_address,
      customer:customers(name, email, phone, cpf_cnpj, address),
      items:order_items(quantity, unit_price, product_name, product_variant_id)
    `)
    .eq('id', orderId)
    .maybeSingle()

  return rawOrder
}

type OrderItemForShipping = {
  quantity: number
  unit_price: number
  product_name: string | null
  product_variant_id: string | null
}

type ItemDespachavel = {
  item: OrderItemForShipping
  nome: string
  pesoKg: number
  width: number
  height: number
  length: number
}

/**
 * Os itens do pedido com as medidas do produto resolvidas.
 *
 * Uma leitura só, usada pela cotação e pela compra da etiqueta: cotar por um
 * pacote e despachar outro é como o cliente paga um frete e a loja paga outro.
 * Item sem peso cadastrado fica de fora — sem peso o ME não cota nem despacha.
 */
async function carregarItensDespachaveis(
  orderItems: OrderItemForShipping[]
): Promise<ItemDespachavel[]> {
  const supabase = createServiceClient()
  const variantIds = orderItems.map((i) => i.product_variant_id).filter(Boolean) as string[]

  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, product:products(name, weight_grams, length_cm, width_cm, height_cm)')
    .in('id', variantIds)

  const despachaveis: ItemDespachavel[] = []

  for (const item of orderItems) {
    if (!item.product_variant_id) continue

    const variant = variants?.find((v) => v.id === item.product_variant_id)
    const productRaw = variant?.product
    const product = (Array.isArray(productRaw) ? productRaw[0] : productRaw) as {
      name: string | null; weight_grams: number | null; length_cm: number | null
      width_cm: number | null; height_cm: number | null
    } | null | undefined

    if (!product?.weight_grams) continue

    despachaveis.push({
      item,
      nome: item.product_name ?? product.name ?? 'Produto',
      pesoKg: product.weight_grams / 1000,
      width: product.width_cm ?? 10,
      height: product.height_cm ?? 5,
      length: product.length_cm ?? 20,
    })
  }

  return despachaveis
}

// O ME separa as duas coisas: products é o conteúdo declarado (o que é e quanto
// vale, usado no seguro e na nota do transportador) e volumes são os pacotes
// físicos. Item com quantidade 2 vira um product de quantidade 2 e dois volumes.
function buildCartPayload(
  despachaveis: ItemDespachavel[]
): { products: MECartProduct[]; volumes: MEVolume[] } {
  const products: MECartProduct[] = []
  const volumes: MEVolume[] = []

  for (const d of despachaveis) {
    products.push({
      name: d.nome,
      quantity: d.item.quantity,
      unitary_value: Number(d.item.unit_price),
    })

    for (let i = 0; i < d.item.quantity; i++) {
      volumes.push({ weight: d.pesoKg, width: d.width, height: d.height, length: d.length })
    }
  }

  return { products, volumes }
}

function buildQuoteItems(despachaveis: ItemDespachavel[]): MEShippingItem[] {
  return despachaveis.map((d) => ({
    weight: d.pesoKg,
    width: d.width,
    height: d.height,
    length: d.length,
    quantity: d.item.quantity,
  }))
}

type EnderecoRaw = {
  street: string; number: string; complement: string | null
  neighborhood: string; city: string; state: string; zip: string
} | null

type ContextoEtiqueta = {
  serviceIdDoPedido: number | null
  totalValue: number
  to: MEAddress
  destinoLegivel: string
  despachaveis: ItemDespachavel[]
  origem: ShippingOrigin
}

/**
 * Tudo que o Melhor Envio precisa saber sobre um pedido: de onde sai, para onde
 * vai e o que vai dentro. Cotação e compra da etiqueta partem daqui — se
 * partissem de leituras separadas voltaria a ser possível cotar um trecho e
 * despachar outro.
 */
async function montarContextoEtiqueta(orderId: string): Promise<ContextoEtiqueta> {
  const rawOrder = await fetchOrderForLabel(orderId)
  if (!rawOrder) throw new Error(`Pedido ${orderId} não encontrado`)

  type CustomerRaw = { name: string; email: string | null; phone: string | null; cpf_cnpj: string | null; address: unknown }
  const customerRaw = (Array.isArray(rawOrder.customer) ? rawOrder.customer[0] : rawOrder.customer) as CustomerRaw | null
  if (!customerRaw) throw new Error('Cliente não encontrado')

  // O destino da etiqueta é o endereço congelado no pedido, não o cadastro atual
  // do cliente: quem mudou de casa depois da compra não pode fazer o pacote deste
  // pedido mudar de rota. Pedidos anteriores ao snapshot caem no cadastro.
  const customerAddress =
    (rawOrder.buyer_address as EnderecoRaw) ?? (customerRaw.address as EnderecoRaw)
  if (!customerAddress) throw new Error('Pedido sem endereço de entrega')

  const orderItems = rawOrder.items as unknown as OrderItemForShipping[]
  const despachaveis = await carregarItensDespachaveis(orderItems)
  if (despachaveis.length === 0) {
    throw new Error('Nenhum produto com dimensões para gerar etiqueta')
  }

  const to: MEAddress = {
    name: (rawOrder.buyer_name as string | null) ?? customerRaw.name,
    phone: onlyDigits((rawOrder.buyer_phone as string | null) ?? customerRaw.phone),
    email: ((rawOrder.buyer_email as string | null) ?? customerRaw.email) ?? '',
    ...meDocumentFields((rawOrder.buyer_cpf_cnpj as string | null) ?? customerRaw.cpf_cnpj),
    address: customerAddress.street,
    number: customerAddress.number,
    complement: customerAddress.complement ?? '',
    district: customerAddress.neighborhood,
    city: customerAddress.city,
    state_abbr: customerAddress.state.trim().toUpperCase(),
    postal_code: onlyDigits(customerAddress.zip),
    country_id: 'BR',
  }

  return {
    serviceIdDoPedido: (rawOrder.melhor_envio_service_id as number | null) ?? null,
    totalValue: Number(rawOrder.total_amount),
    to,
    destinoLegivel: `${customerAddress.city}/${customerAddress.state.trim().toUpperCase()}`,
    despachaveis,
    origem: await getShippingOrigin(),
  }
}

/**
 * Quais transportadoras atendem, hoje, o trecho deste pedido.
 *
 * A escolha do cliente no checkout é um retrato do momento da compra. Entre ela
 * e a compra da etiqueta a origem da loja pode mudar de cidade — foi o que
 * aconteceu quando o endereço fiscal virou a origem do frete: um pedido cotado
 * saindo de Arraial d'Ajuda passou a ser despachado de Muriaé, e a Jadlog, que
 * atendia BA→MG, não atende o trecho dentro de Muriaé. Sem uma cotação viva o
 * painel só sabe repetir a escolha que já falhou.
 */
export async function cotarFretesDoPedido(orderId: string): Promise<CotacaoPedido> {
  const ctx = await montarContextoEtiqueta(orderId)
  return cotarComContexto(ctx)
}

async function cotarComContexto(ctx: ContextoEtiqueta): Promise<CotacaoPedido> {
  const origemLegivel = ctx.origem.endereco.city
    ? `${ctx.origem.endereco.city}/${ctx.origem.endereco.state}`
    : `CEP ${ctx.origem.endereco.zip}`

  const cotacao = await calculateShipping(
    ctx.to.postal_code,
    buildQuoteItems(ctx.despachaveis),
    ctx.origem.endereco.zip
  )

  const opcoes: OpcaoFretePedido[] = cotacao
    .filter((q) => !q.error && q.price != null)
    .map((q) => ({
      serviceId: q.id,
      company: q.company?.name ?? '',
      name: q.name ?? '',
      price: Number(String(q.price!).replace(',', '.')),
      prazoMin: q.delivery_range?.min ?? 0,
      prazoMax: q.delivery_range?.max ?? 0,
    }))
    .sort((a, b) => a.price - b.price)

  return { origem: origemLegivel, destino: ctx.destinoLegivel, opcoes }
}

/**
 * Compra a etiqueta no Melhor Envio.
 *
 * Chamada sem `serviceIdEscolhido` pelo webhook do pagamento, com o serviço que
 * o cliente escolheu no checkout; com ele pelo painel, quando o Henrique troca
 * de transportadora porque a do checkout não atende mais o trecho.
 */
export async function purchaseShippingLabel(
  orderId: string,
  serviceIdEscolhido?: number
): Promise<void> {
  const supabase = createServiceClient()
  const ctx = await montarContextoEtiqueta(orderId)

  const serviceId = serviceIdEscolhido ?? ctx.serviceIdDoPedido
  if (!serviceId) {
    return
  }

  // Troca manual de transportadora: confere na cotação de agora antes de gastar
  // saldo, e é de lá que sai o nome do serviço — o painel não pode dizer que
  // despachou por SEDEX só porque o navegador mandou esse texto.
  let nomeDoServicoEscolhido: string | null = null
  if (serviceIdEscolhido) {
    const { opcoes, origem, destino } = await cotarComContexto(ctx)
    const escolhida = opcoes.find((o) => o.serviceId === serviceIdEscolhido)
    if (!escolhida) {
      throw new TransportadoraIndisponivelError(
        `A transportadora escolhida não atende mais o trecho ${origem} → ${destino}. Escolha uma das opções abaixo.`,
        opcoes
      )
    }
    nomeDoServicoEscolhido = `${escolhida.company} ${escolhida.name}`.trim()
  }

  const { products, volumes } = buildCartPayload(ctx.despachaveis)

  // 1. Add to ME cart
  let meOrderId: string
  try {
    meOrderId = await addToCart({
      serviceId,
      from: await buildStoreAddress(ctx.origem),
      to: ctx.to,
      products,
      volumes,
      orderId,
      totalValue: ctx.totalValue,
    })
  } catch (err) {
    throw await explicarFalhaNoCarrinho(err, ctx, serviceId)
  }

  // 2. Guarda o vínculo antes de pagar. Se o checkout falhar, o envio já existe
  // no Melhor Envio e sem este id ele fica órfão: o painel não consegue retomar
  // e uma nova tentativa criaria um segundo envio para o mesmo pedido.
  await supabase
    .from('orders')
    .update({
      melhor_envio_order_id: meOrderId,
      // Trocou de transportadora: o pedido passa a dizer por qual o pacote saiu.
      // shipping_amount não muda — é o que o cliente pagou, e a diferença é da loja.
      ...(serviceIdEscolhido
        ? { melhor_envio_service_id: serviceIdEscolhido, shipping_method: nomeDoServicoEscolhido }
        : {}),
    })
    .eq('id', orderId)

  // 3. Checkout (debita a carteira do ME)
  await checkoutCart([meOrderId])

  await supabase.from('orders').update({ status: 'separating' }).eq('id', orderId)

  // 4. Try to generate label right away (works in production; sandbox needs ~5 min approval)
  try {
    await generateLabel([meOrderId])
    await new Promise((r) => setTimeout(r, 2000))
    const tracking = await getTrackingCode(meOrderId)
    if (tracking) {
      await supabase.from('orders').update({ tracking_code: tracking }).eq('id', orderId)
    }
  } catch {
    // Sandbox: checkout ainda não aprovado (aprovação automática em ~5 min)
    // Use "Gerar Etiqueta" no painel admin depois
  }
}

/**
 * Traduz a recusa do carrinho do Melhor Envio.
 *
 * O ME responde 500 com um JSON cru — `{"error":"Houve um erro ao verificar o
 * valor do pedido: Transportadora não atende este trecho."}` — que o painel
 * mostrava inteiro, sem dizer qual transportadora nem qual trecho. Refazer a
 * cotação na hora do erro responde as duas coisas e ainda entrega a saída: as
 * transportadoras que atendem. O custo da consulta extra só é pago quando já
 * deu errado; o caminho feliz continua com uma chamada só.
 */
async function explicarFalhaNoCarrinho(
  erroOriginal: unknown,
  ctx: ContextoEtiqueta,
  serviceId: number
): Promise<Error> {
  const original =
    erroOriginal instanceof Error ? erroOriginal : new Error(String(erroOriginal))

  let cotacao: CotacaoPedido
  try {
    cotacao = await cotarComContexto(ctx)
  } catch {
    // A cotação também falhou: sem diagnóstico melhor, vale o erro de verdade.
    return original
  }

  const aindaAtende = cotacao.opcoes.some((o) => o.serviceId === serviceId)
  if (aindaAtende) {
    // A transportadora atende o trecho — a recusa foi por outro motivo (saldo,
    // documento, dimensão). Reescrever isso esconderia a causa real.
    return original
  }

  return new TransportadoraIndisponivelError(
    `A transportadora escolhida na compra não atende o trecho ${cotacao.origem} → ${cotacao.destino}. ` +
      (cotacao.opcoes.length > 0
        ? 'Escolha uma das transportadoras disponíveis abaixo.'
        : 'Nenhuma transportadora atende este trecho hoje — confira o endereço de origem em /admin/config/envio.'),
    cotacao.opcoes
  )
}
