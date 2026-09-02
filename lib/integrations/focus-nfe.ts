import { onlyDigits } from '@/lib/documento'
import { readEnv, readEnvOption } from '@/lib/env'
import type { Emitente } from '@/lib/server/store-identity'
import type { Customer, NfeStatus, Order, OrderItem, PaymentMethod, Product, ProductVariant } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type FocusNfeStatus =
  | 'autorizado'
  | 'processando_autorizacao'
  | 'erro_autorizacao'
  | 'cancelado'
  | 'denegado'

export type FocusNfeResponse = {
  status: FocusNfeStatus
  numero: string | null          // número da NF-e (ex: "000000042")
  chave_nfe: string | null       // chave de acesso 44 dígitos
  caminho_danfe: string | null   // URL do DANFE (PDF)
  caminho_xml: string | null     // URL do XML
  mensagem_sefaz: string | null  // mensagem de erro/sucesso da SEFAZ
  numero_protocolo: string | null
}

export type OrderItemWithProduct = OrderItem & {
  product_variant?: ProductVariant & { product?: Product }
}

// Payload enviado à API Focus NFe para emissão de NF-e.
//
// ⚠️ A API usa CAMPOS PLANOS com sufixo — `cnpj_emitente`, `uf_destinatario` —,
// nunca objetos aninhados. Não existe chave "emitente" nem "destinatario" no
// schema. Enviar `emitente: { cnpj }` faz `cnpj_emitente` chegar AUSENTE, e a
// resposta é HTTP 403 "CNPJ do emitente não autorizado": uma mensagem de
// permissão para um erro de campo faltando. Foi o que travou a emissão por
// semanas, com token, certificado e cadastro todos corretos.
//
// Referência: https://doc.focusnfe.com.br/reference/emitir_nfe.md e
// https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html (nomes de campo).
export type FocusNfePayload = {
  natureza_operacao: string
  data_emissao: string
  data_entrada_saida: string
  tipo_documento: number
  finalidade_emissao: number
  consumidor_final: number
  presenca_comprador: number
  modalidade_frete: number

  // Emitente — endereço FISCAL (cartão CNPJ), não o de origem do frete
  cnpj_emitente: string
  nome_emitente: string
  inscricao_estadual_emitente: string
  logradouro_emitente: string
  numero_emitente: string
  complemento_emitente?: string
  bairro_emitente: string
  municipio_emitente: string
  uf_emitente: string
  cep_emitente: string
  regime_tributario_emitente: number

  // Destinatário — CPF e CNPJ são campos distintos; vai o que o documento for
  nome_destinatario: string
  cpf_destinatario?: string
  cnpj_destinatario?: string
  email_destinatario?: string
  indicador_inscricao_estadual_destinatario: number
  logradouro_destinatario: string
  numero_destinatario: string
  complemento_destinatario?: string
  bairro_destinatario: string
  municipio_destinatario: string
  uf_destinatario: string
  cep_destinatario: string

  // Totais
  valor_produtos: number
  valor_frete: number
  valor_desconto: number
  valor_total: number

  items: Array<{
    numero_item: number
    codigo_produto: string
    codigo_ncm: string
    cfop: string
    descricao: string
    quantidade_comercial: number
    quantidade_tributavel: number
    unidade_comercial: string
    unidade_tributavel: string
    valor_unitario_comercial: number
    valor_unitario_tributavel: number
    valor_bruto: number
    icms_origem: number
    icms_situacao_tributaria: string
    pis_situacao_tributaria: string
    cofins_situacao_tributaria: string
  }>
  formas_pagamento: Array<{
    forma_pagamento: string
    valor_pagamento: number
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

// Comparação tolerante a comentário inline e caixa: o campo da Vercel não corta
// o `# comentário` que o dotenv corta, e qualquer sujeira no valor mandava a
// emissão para o host de produção em silêncio.
function isHomologacao(): boolean {
  return readEnvOption('FOCUS_NFE_AMBIENTE') === 'homologacao'
}

export function getFocusHost(): string {
  return isHomologacao() ? 'homologacao.focusnfe.com.br' : 'api.focusnfe.com.br'
}

function getBaseUrl(): string {
  return `https://${getFocusHost()}/v2`
}

// A SEFAZ exige este nome exato no destinatário de qualquer NF-e de homologação —
// nota com o nome real do cliente volta rejeitada.
const NOME_DESTINATARIO_HOMOLOGACAO =
  'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'

function getAuthHeader(): string {
  const token = readEnv('FOCUS_NFE_TOKEN')
  if (!token) {
    throw new Error(
      '[Focus NFe] FOCUS_NFE_TOKEN não configurado. Defina a variável de ambiente antes de emitir NF-e.'
    )
  }
  return `Basic ${Buffer.from(`${token}:`).toString('base64')}`
}

// Determina CFOP baseado no estado do destinatário vs estado do emitente.
//
// A UF do emitente é a do endereço FISCAL — o do cartão CNPJ —, não a de onde o
// pacote sai. Enquanto as duas eram a mesma variável STORE_ESTADO isso não
// aparecia; com a sede em MG e a loja na BA, ler a UF errada faria toda venda
// baiana sair como operação interna quando ela é interestadual.
function determineCfop(destinatarioUf: string, emitenteUf: string): string {
  return destinatarioUf.trim().toUpperCase() === emitenteUf.trim().toUpperCase() ? '5102' : '6102'
}

// 5102 e 6102 são o mesmo par — qual dos dois vale depende do destino da venda,
// não do cadastro do produto. Como products.cfop nasce com '6102' por default,
// respeitar o cadastro faria toda venda dentro da Bahia sair com o CFOP errado
// e ser rejeitada pela SEFAZ. Um CFOP fora desse par é escolha deliberada de
// quem cadastrou (operação especial) e continua valendo.
function resolveCfop(
  cfopCadastrado: string | null | undefined,
  destinatarioUf: string,
  emitenteUf: string
): string {
  const configurado = (cfopCadastrado ?? '').trim()
  if (!configurado || configurado === '5102' || configurado === '6102') {
    return determineCfop(destinatarioUf, emitenteUf)
  }
  return configurado
}

// Valor monetário com 2 casas. Somar preços em ponto flutuante e mandar o
// resultado cru punha 415.79999999999995 no corpo da requisição — a SEFAZ compara
// o total declarado com a soma dos itens e não perdoa a diferença.
function money(valor: number): number {
  return Math.round(valor * 100) / 100
}

// Mapeia método de pagamento do sistema para código Focus NFe
function mapPaymentMethod(method: PaymentMethod | null): string {
  switch (method) {
    case 'pix':
      return '17'
    case 'credit_card':
      return '03'
    case 'boleto':
      return '15'
    default:
      return '99' // outros
  }
}

// Interpreta a resposta HTTP da API Focus NFe e normaliza para FocusNfeResponse
async function parseResponse(res: Response, host: string): Promise<FocusNfeResponse> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error(
      `[Focus NFe] Resposta inválida da API (HTTP ${res.status}, host: ${host}): corpo não é JSON`
    )
  }

  if (!res.ok) {
    const data = body as Record<string, unknown>
    const msg = (data['mensagem'] as string | null) ?? `HTTP ${res.status}`
    // O host vai junto porque uma recusa de credencial ou de CNPJ costuma ser a
    // requisição ter saído para o ambiente errado — sem ele o log não responde sozinho.
    throw new Error(`[Focus NFe] Erro da API (HTTP ${res.status}, host: ${host}): ${msg}`)
  }

  // A API Focus NFe retorna campos em snake_case na raiz do objeto
  const data = body as Record<string, unknown>

  return {
    status: (data['status'] as FocusNfeStatus) ?? 'erro_autorizacao',
    numero: (data['numero'] as string | null) ?? null,
    chave_nfe: (data['chave_nfe'] as string | null) ?? null,
    caminho_danfe: (data['caminho_danfe'] as string | null) ?? null,
    caminho_xml: (data['caminho_xml'] as string | null) ?? null,
    mensagem_sefaz: (data['mensagem_sefaz'] as string | null) ?? null,
    numero_protocolo: (data['numero_protocolo'] as string | null) ?? null,
  }
}

// Mapeia o status da API Focus NFe para o valor aceito pelo CHECK constraint do banco
export function toNfeStatus(apiStatus: FocusNfeStatus): NfeStatus {
  switch (apiStatus) {
    case 'autorizado':               return 'autorizado'
    case 'processando_autorizacao':  return 'processando'
    case 'erro_autorizacao':         return 'erro'
    case 'cancelado':                return 'cancelado'
    case 'denegado':                 return 'denegado'
    default:                         return 'erro'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS — chamadas HTTP à API Focus NFe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emite uma NF-e de forma assíncrona.
 * O status retornado geralmente é 'processando_autorizacao'.
 * Use consultarNfe() para verificar quando foi autorizada.
 */
export async function emitirNfe(ref: string, payload: FocusNfePayload): Promise<FocusNfeResponse> {
  const auth = getAuthHeader()
  const url = `${getBaseUrl()}/nfe?ref=${encodeURIComponent(ref)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse(res, getFocusHost())
}

/**
 * Consulta o status atual de uma NF-e pelo ref interno.
 */
export async function consultarNfe(ref: string): Promise<FocusNfeResponse> {
  const auth = getAuthHeader()
  const url = `${getBaseUrl()}/nfe/${encodeURIComponent(ref)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: auth,
    },
  })

  return parseResponse(res, getFocusHost())
}

/**
 * Cancela uma NF-e autorizada.
 * Só é possível cancelar quando status = 'autorizado'.
 * A justificativa deve ter entre 15 e 255 caracteres.
 */
export async function cancelarNfe(ref: string, justificativa: string): Promise<FocusNfeResponse> {
  const auth = getAuthHeader()
  const url = `${getBaseUrl()}/nfe/${encodeURIComponent(ref)}`

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ justificativa }),
  })

  return parseResponse(res, getFocusHost())
}

// ─────────────────────────────────────────────────────────────────────────────
// buildNfePayload — monta o payload a partir dos dados do pedido
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constrói o payload da NF-e a partir dos dados do pedido, itens e cliente.
 * Não faz chamadas HTTP nem acessa o banco de dados.
 *
 * O emitente chega pronto como argumento, e não é lido aqui dentro. Antes eram
 * sete variáveis de ambiente invisíveis na assinatura: a função prometia não
 * tocar em nada externo e dependia da Vercel para produzir o endereço da nota.
 * Quem monta e valida o emitente é resolveEmitente(), em lib/server/store-identity.
 *
 * Pré-condição: customer.address não pode ser null (validar antes de chamar).
 */
export function buildNfePayload(
  order: Order,
  items: OrderItemWithProduct[],
  customer: Customer,
  emitente: Emitente
): FocusNfePayload {
  if (!customer.address) {
    throw new Error(
      `[Focus NFe] Cliente ${customer.id} não possui endereço cadastrado. Impossível emitir NF-e.`
    )
  }

  // Timestamp de emissão em formato ISO 8601 com timezone BRT (-03:00).
  // Offset UTC por -3h antes de formatar para não rotular horário UTC como BRT.
  const brtOffsetMs = -3 * 60 * 60 * 1000
  const brtDate = new Date(Date.now() + brtOffsetMs)
  const dataEmissao = brtDate.toISOString().replace('Z', '-03:00')

  // Valida que todos os itens possuem NCM antes de montar o payload.
  // Um NCM errado ou ausente causa rejeição pela SEFAZ.
  for (const item of items) {
    const ncm = item.product_variant?.product?.ncm
    if (!ncm) {
      throw new Error(
        `[Focus NFe] Produto "${item.product_variant?.product?.name ?? item.product_variant_id}" não possui NCM cadastrado. Cadastre o NCM no painel antes de emitir NF-e.`
      )
    }
  }

  const itensNf = items.map((item, index) => {
    const cfop = resolveCfop(
      item.product_variant?.product?.cfop,
      customer.address!.state,
      emitente.endereco.state
    )

    return {
      numero_item: index + 1,
      // Obrigatório. O SKU é o código interno do produto; sem ele a própria doc
      // manda usar o CFOP no formato CFOP9999.
      codigo_produto: item.product_variant?.sku || `CFOP${cfop}`,
      // NCM já validado acima — cast seguro
      codigo_ncm: item.product_variant!.product!.ncm!,
      cfop,
      descricao: item.product_variant?.product?.name ?? 'Produto',
      quantidade_comercial: item.quantity,
      quantidade_tributavel: item.quantity,
      unidade_comercial: 'UN',
      unidade_tributavel: 'UN',
      valor_unitario_comercial: money(item.unit_price),
      valor_unitario_tributavel: money(item.unit_price),
      valor_bruto: money(item.quantity * item.unit_price),
      icms_origem: 0,
      // CSOSN, porque o regime é Simples Nacional. 400 = não tributada pelo
      // Simples Nacional. O nome do campo é situacao_tributaria — icms_modalidade
      // não existe no schema e era ignorado.
      icms_situacao_tributaria: '400',
      pis_situacao_tributaria: '07',    // operação isenta
      cofins_situacao_tributaria: '07', // operação isenta
    }
  })

  // Totais somados a partir dos itens já arredondados: somar antes de arredondar
  // produzia 415.79999999999995 no corpo da requisição.
  const valorProdutos = money(itensNf.reduce((soma, item) => soma + item.valor_bruto, 0))
  const valorFrete = money(order.shipping_amount)
  const valorDesconto = money(order.discount_amount)
  const valorTotal = money(valorProdutos + valorFrete - valorDesconto)

  const documento = onlyDigits(customer.cpf_cnpj)
  const complementoEmitente = emitente.endereco.complement.trim()
  const complementoDestinatario = (customer.address.complement ?? '').trim()

  return {
    natureza_operacao: 'Venda de mercadoria',
    data_emissao: dataEmissao,
    data_entrada_saida: dataEmissao,
    tipo_documento: 1,       // saída
    finalidade_emissao: 1,   // normal
    consumidor_final: 1,
    presenca_comprador: 2,   // operação não presencial / internet
    modalidade_frete: 1,     // CIF (por conta do emitente)

    cnpj_emitente: emitente.cnpj,
    nome_emitente: emitente.nome,
    // IE aceita 'ISENTO', então vai como texto — não pode virar só dígitos
    inscricao_estadual_emitente: emitente.inscricaoEstadual,
    logradouro_emitente: emitente.endereco.street,
    numero_emitente: emitente.endereco.number,
    ...(complementoEmitente ? { complemento_emitente: complementoEmitente } : {}),
    bairro_emitente: emitente.endereco.district,
    municipio_emitente: emitente.endereco.city,
    uf_emitente: emitente.endereco.state,
    cep_emitente: emitente.endereco.zip,
    regime_tributario_emitente: emitente.regimeTributario,

    nome_destinatario: isHomologacao() ? NOME_DESTINATARIO_HOMOLOGACAO : customer.name,
    // CPF e CNPJ são campos diferentes: mandar CPF em cnpj_destinatario é rejeição
    ...(documento.length === 14 ? { cnpj_destinatario: documento } : { cpf_destinatario: documento }),
    ...(customer.email ? { email_destinatario: customer.email } : {}),
    indicador_inscricao_estadual_destinatario: 9, // não contribuinte
    logradouro_destinatario: customer.address.street,
    numero_destinatario: customer.address.number,
    ...(complementoDestinatario ? { complemento_destinatario: complementoDestinatario } : {}),
    bairro_destinatario: customer.address.neighborhood,
    municipio_destinatario: customer.address.city,
    uf_destinatario: customer.address.state.trim().toUpperCase(),
    cep_destinatario: onlyDigits(customer.address.zip),

    valor_produtos: valorProdutos,
    valor_frete: valorFrete,
    valor_desconto: valorDesconto,
    valor_total: valorTotal,

    items: itensNf,
    formas_pagamento: [
      {
        forma_pagamento: mapPaymentMethod(order.payment_method),
        valor_pagamento: valorTotal,
      },
    ],
  }
}
