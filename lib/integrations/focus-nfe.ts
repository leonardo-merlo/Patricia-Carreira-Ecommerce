import { isValidCnpj, onlyDigits } from '@/lib/documento'
import { readEnv, readEnvNumber, readEnvOption } from '@/lib/env'
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

// Payload enviado à API Focus NFe para emissão de NF-e
export type FocusNfePayload = {
  natureza_operacao: string
  data_emissao: string
  data_entrada_saida: string
  tipo_documento: number
  finalidade_emissao: number
  consumidor_final: number
  presenca_comprador: number
  modalidade_frete: number
  emitente: {
    cnpj: string
    inscricao_estadual: string
    nome: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    municipio: string
    uf: string
    cep: string
    codigo_regime_tributario: number
  }
  destinatario: {
    cpf_cnpj: string
    nome_completo: string
    email: string
    endereco: {
      logradouro: string
      numero: string
      complemento: string
      bairro: string
      municipio: string
      uf: string
      cep: string
    }
    indicador_inscricao_estadual: number
  }
  items: Array<{
    numero_item: number
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
    icms_modalidade: string
    pis_modalidade: string
    cofins_modalidade: string
  }>
  formas_pagamento: Array<{
    forma_pagamento: string
    valor_pagamento: number
  }>
  valor_frete: number
  valor_desconto: number
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

// Determina CFOP baseado no estado do destinatário vs estado do emitente
function determineCfop(destinatarioUf: string): string {
  const emitenteUf = readEnv('STORE_ESTADO')
  return destinatarioUf.trim().toUpperCase() === emitenteUf.toUpperCase() ? '5102' : '6102'
}

// 5102 e 6102 são o mesmo par — qual dos dois vale depende do destino da venda,
// não do cadastro do produto. Como products.cfop nasce com '6102' por default,
// respeitar o cadastro faria toda venda dentro da Bahia sair com o CFOP errado
// e ser rejeitada pela SEFAZ. Um CFOP fora desse par é escolha deliberada de
// quem cadastrou (operação especial) e continua valendo.
function resolveCfop(cfopCadastrado: string | null | undefined, destinatarioUf: string): string {
  const configurado = (cfopCadastrado ?? '').trim()
  if (!configurado || configurado === '5102' || configurado === '6102') {
    return determineCfop(destinatarioUf)
  }
  return configurado
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
 * Pré-condição: customer.address não pode ser null (validar antes de chamar).
 */
export function buildNfePayload(
  order: Order,
  items: OrderItemWithProduct[],
  customer: Customer
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

  // O Focus recusa com "CNPJ do emitente não autorizado" quando o CNPJ do corpo
  // não é o da empresa dona do token — e um STORE_CNPJ vazio, ou com o comentário
  // colado junto, vira string vazia aqui e produz exatamente essa mensagem, que não
  // aponta para a variável. Conferir antes devolve o nome do problema.
  const emitenteCnpj = onlyDigits(readEnv('STORE_CNPJ'))
  if (!isValidCnpj(emitenteCnpj)) {
    throw new Error(
      `[Focus NFe] STORE_CNPJ ausente ou inválido (valor lido: "${emitenteCnpj || '(vazio)'}"). ` +
        'Defina o CNPJ do emitente na Vercel e no .env.local: só dígitos, sem comentário no valor.'
    )
  }

  // Total fiscal calculado a partir dos itens para garantir coerência com SEFAZ.
  const fiscalTotal =
    items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) +
    order.shipping_amount -
    order.discount_amount

  return {
    natureza_operacao: 'Venda de mercadoria',
    data_emissao: dataEmissao,
    data_entrada_saida: dataEmissao,
    tipo_documento: 1,       // saída
    finalidade_emissao: 1,   // normal
    consumidor_final: 1,
    presenca_comprador: 2,   // operação não presencial / internet
    modalidade_frete: 1,     // CIF (por conta do emitente)
    emitente: {
      cnpj: emitenteCnpj,
      // IE aceita 'ISENTO', então só tira espaço — não pode virar só dígitos
      inscricao_estadual: readEnv('STORE_IE'),
      nome: readEnv('STORE_NOME'),
      logradouro: readEnv('STORE_LOGRADOURO'),
      numero: readEnv('STORE_NUMERO'),
      complemento: readEnv('STORE_COMPLEMENTO'),
      bairro: readEnv('STORE_BAIRRO'),
      municipio: readEnv('STORE_CIDADE'),
      uf: readEnv('STORE_ESTADO'),
      cep: onlyDigits(readEnv('STORE_CEP_ORIGEM')),
      codigo_regime_tributario: readEnvNumber('FOCUS_NFE_REGIME_TRIBUTARIO', 1),
    },
    destinatario: {
      cpf_cnpj: onlyDigits(customer.cpf_cnpj),
      nome_completo: isHomologacao() ? NOME_DESTINATARIO_HOMOLOGACAO : customer.name,
      email: customer.email ?? '',
      endereco: {
        logradouro: customer.address.street,
        numero: customer.address.number,
        complemento: customer.address.complement ?? '',
        bairro: customer.address.neighborhood,
        municipio: customer.address.city,
        uf: customer.address.state,
        cep: onlyDigits(customer.address.zip),
      },
      indicador_inscricao_estadual: 9, // não contribuinte
    },
    items: items.map((item, index) => ({
      numero_item: index + 1,
      // NCM já validado acima — cast seguro
      codigo_ncm: item.product_variant!.product!.ncm!,
      cfop: resolveCfop(item.product_variant?.product?.cfop, customer.address!.state),
      descricao: item.product_variant?.product?.name ?? 'Produto',
      quantidade_comercial: item.quantity,
      quantidade_tributavel: item.quantity,
      unidade_comercial: 'UN',
      unidade_tributavel: 'UN',
      valor_unitario_comercial: item.unit_price,
      valor_unitario_tributavel: item.unit_price,
      valor_bruto: item.quantity * item.unit_price,
      icms_origem: 0,
      icms_modalidade: '400',  // Simples Nacional: não tributado
      pis_modalidade: '07',    // operação isenta
      cofins_modalidade: '07', // operação isenta
    })),
    formas_pagamento: [
      {
        forma_pagamento: mapPaymentMethod(order.payment_method),
        valor_pagamento: fiscalTotal,
      },
    ],
    valor_frete: order.shipping_amount,
    valor_desconto: order.discount_amount,
  }
}
