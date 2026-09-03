import { readEnv } from '@/lib/env'
function baseUrl() {
  // readEnv e não process.env cru: comentário inline colado no valor viraria
  // parte da URL e toda chamada ao ME sairia para um host inexistente.
  return readEnv('MELHOR_ENVIO_BASE_URL') || 'https://melhorenvio.com.br/api/v2'
}

function authHeaders() {
  return {
    Authorization: `Bearer ${readEnv('MELHOR_ENVIO_TOKEN')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': `${readEnv('MELHOR_ENVIO_APP_NAME') || 'App'} (${readEnv('MELHOR_ENVIO_CONTACT_EMAIL') || 'dev@app.com'})`,
  }
}

export type MEShippingItem = {
  weight: number   // kg
  width: number    // cm
  height: number   // cm
  length: number   // cm
  quantity: number
}

export type MEQuoteResult = {
  id: number
  name: string
  price: number | null
  currency: string
  delivery_range: { min: number; max: number }
  company: { id: number; name: string; picture: string }
  error?: string
}

export type MEAddress = {
  name: string
  phone: string
  email: string
  /** CPF, só quando for pessoa física — o ME valida o dígito e recusa o resto */
  document?: string
  /** CNPJ, quando for pessoa jurídica */
  company_document?: string
  address: string
  number: string
  complement: string
  district: string
  city: string
  state_abbr: string
  postal_code: string
  country_id: 'BR'
}

/** Item do carrinho como o ME espera: o que é, quantos e quanto vale. */
export type MECartProduct = {
  name: string
  quantity: number
  unitary_value: number
}

/** Cada volume é um pacote físico. Item com quantidade 2 vira dois volumes. */
export type MEVolume = {
  height: number
  width: number
  length: number
  weight: number
}

/**
 * Lê a resposta como JSON sem confiar no status. O ME responde 200 com HTML
 * quando a rota existe mas o verbo está errado, e aí o `res.json()` cru estoura
 * "Unexpected token '<'" — mensagem que não diz nada a quem está no painel.
 */
async function lerJson<T>(res: Response, contexto: string): Promise<T> {
  const texto = await res.text()
  try {
    return JSON.parse(texto) as T
  } catch {
    const inicio = texto.trim().slice(0, 80)
    throw new Error(
      `Melhor Envio: resposta inesperada na ${contexto} (${res.status}, ${res.headers.get('content-type') ?? 'sem content-type'}): ${inicio}`
    )
  }
}

export async function calculateShipping(
  toCep: string,
  items: MEShippingItem[],
  fromCep: string
): Promise<MEQuoteResult[]> {
  const cleanFromCep = fromCep.replace(/\D/g, '')

  const res = await fetch(`${baseUrl()}/me/shipment/calculate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      from: { postal_code: cleanFromCep },
      to: { postal_code: toCep.replace(/\D/g, '') },
      products: items.map((i) => ({
        weight: i.weight,
        width: i.width,
        height: i.height,
        length: i.length,
        quantity: i.quantity,
        insurance_value: 0,
      })),
      options: { receipt: false, own_hand: false },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro ao calcular frete (${res.status}): ${text}`)
  }

  return lerJson<MEQuoteResult[]>(res, 'cotação de frete')
}

type AddToCartInput = {
  serviceId: number
  from: MEAddress
  to: MEAddress
  products: MECartProduct[]
  volumes: MEVolume[]
  orderId: string   // our internal order ID, stored as tag for later lookup
  totalValue: number
}

export async function addToCart(input: AddToCartInput): Promise<string> {
  const res = await fetch(`${baseUrl()}/me/cart`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      service: input.serviceId,
      from: input.from,
      to: input.to,
      products: input.products,
      volumes: input.volumes,
      options: {
        insurance_value: input.totalValue,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: false,
        platform: readEnv('MELHOR_ENVIO_APP_NAME') || 'App',
        tags: [{ tag: input.orderId, url: null }],
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro ao adicionar ao carrinho (${res.status}): ${text}`)
  }

  const data = await lerJson<{ id: string }>(res, 'inclusão no carrinho')
  return data.id
}

/**
 * Paga os fretes já adicionados ao carrinho. É o passo que faltava para a
 * etiqueta existir: sem ele o frete fica no carrinho do ME e nunca vira envio.
 *
 * A rota é `/me/shipment/checkout`. `/me/checkout` existe, mas só aceita GET —
 * respondia 405 a cada compra, e como a falha de etiqueta é isolada em
 * try/catch no fulfillment, o pedido seguia "pago" com a etiqueta faltando.
 *
 * `orders` vazio faz o ME pagar o carrinho inteiro. Mandar sempre a lista
 * explícita evita cobrar fretes de outros pedidos por engano.
 */
export async function checkoutCart(meOrderIds: string[]): Promise<void> {
  if (meOrderIds.length === 0) return

  const res = await fetch(`${baseUrl()}/me/shipment/checkout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orders: meOrderIds }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro no checkout (${res.status}): ${text}`)
  }
}

/** A etiqueta já existe, ou o ME ainda está preparando — que não é falha. */
export type ResultadoGeracao =
  | { pronta: true }
  | { pronta: false; aviso: string }

/** Já gerada: falso negativo do ME, para nós é sucesso. */
const JA_GERADA = /j[áa] est[áa] gerad/i

/**
 * Ainda em preparo. O ME responde "O envio já está sendo processado. Aguarde,
 * seu envio será gerado em instantes" — que é uma fila andando, não uma recusa.
 * Tratar isso como erro pintava de vermelho no painel um estado normal, ao lado
 * de falhas de verdade, e não havia como distinguir os dois olhando a tela.
 */
const EM_PREPARO = /sendo processad|aguarde|em instantes/i

export async function generateLabel(meOrderIds: string[]): Promise<ResultadoGeracao> {
  const res = await fetch(`${baseUrl()}/me/shipment/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orders: meOrderIds }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro ao gerar etiqueta (${res.status}): ${text}`)
  }

  // O ME responde 200 mesmo quando não gerou nada: cada envio volta com um
  // status booleano e a explicação. Sem olhar isso, uma recusa real passaria
  // por sucesso.
  const data = await lerJson<Record<string, { status?: boolean; message?: string }>>(
    res,
    'geração de etiqueta'
  )

  const naoGeradas = Object.values(data).filter(
    (r) => r?.status === false && !JA_GERADA.test(r.message ?? '')
  )

  if (naoGeradas.length === 0) return { pronta: true }

  const emPreparo = naoGeradas.filter((r) => EM_PREPARO.test(r.message ?? ''))

  // Só é falha o que não é fila. Uma recusa de verdade no meio continua sendo
  // erro, mesmo que outro envio do lote esteja apenas esperando.
  const falhas = naoGeradas.filter((r) => !EM_PREPARO.test(r.message ?? ''))

  if (falhas.length > 0) {
    throw new Error(
      `Melhor Envio: etiqueta não gerada — ${falhas.map((f) => f.message ?? 'motivo não informado').join('; ')}`
    )
  }

  return {
    pronta: false,
    aviso:
      emPreparo[0]?.message?.trim() ||
      'O Melhor Envio ainda está preparando o envio.',
  }
}

type METrackingEntry = {
  status?: string
  /** Código da transportadora — só existe depois da postagem. */
  tracking?: string | null
  /** Código do próprio Melhor Envio, disponível assim que a etiqueta é gerada. */
  melhorenvio_tracking?: string | null
}

/**
 * Consulta de rastreio. É POST com os ids no corpo: em GET o Melhor Envio
 * responde 200 com uma página HTML, e o `res.json()` estourava
 * "Unexpected token '<'" — que era o erro que aparecia no painel ao gerar a
 * etiqueta, escondendo o fato de que a etiqueta já tinha sido gerada.
 */
export async function getTrackingCode(meOrderId: string): Promise<string | null> {
  const res = await fetch(`${baseUrl()}/me/shipment/tracking`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orders: [meOrderId] }),
  })

  if (!res.ok) return null

  const data = await lerJson<Record<string, METrackingEntry>>(res, 'consulta de rastreio')
  const entrada = data[meOrderId]
  // Antes da postagem só existe o código do ME; o dos Correios entra depois.
  return entrada?.tracking || entrada?.melhorenvio_tracking || null
}

export async function printLabel(meOrderIds: string[]): Promise<string> {
  const res = await fetch(`${baseUrl()}/me/shipment/print`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ mode: 'private', orders: meOrderIds }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro ao imprimir etiqueta (${res.status}): ${text}`)
  }

  const data = await lerJson<{ url: string }>(res, 'impressão da etiqueta')
  return data.url
}
