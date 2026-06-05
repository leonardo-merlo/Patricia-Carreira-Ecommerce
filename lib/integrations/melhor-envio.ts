function baseUrl() {
  return process.env.MELHOR_ENVIO_BASE_URL ?? 'https://melhorenvio.com.br/api/v2'
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': `${process.env.MELHOR_ENVIO_APP_NAME ?? 'App'} (${process.env.MELHOR_ENVIO_CONTACT_EMAIL ?? 'dev@app.com'})`,
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

type MEAddress = {
  name: string
  phone: string
  email: string
  document: string
  address: string
  number: string
  complement: string
  district: string
  city: string
  state_abbr: string
  postal_code: string
  country_id: 'BR'
}

export async function calculateShipping(
  toCep: string,
  items: MEShippingItem[]
): Promise<MEQuoteResult[]> {
  const fromCep = process.env.STORE_CEP_ORIGEM!.replace(/\D/g, '')

  const res = await fetch(`${baseUrl()}/me/shipment/calculate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      from: { postal_code: fromCep },
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

  return res.json() as Promise<MEQuoteResult[]>
}

type AddToCartInput = {
  serviceId: number
  from: MEAddress
  to: MEAddress
  items: MEShippingItem[]
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
      products: input.items.map((i) => ({
        weight: i.weight,
        width: i.width,
        height: i.height,
        length: i.length,
        quantity: i.quantity,
        insurance_value: input.totalValue / input.items.reduce((s, x) => s + x.quantity, 0),
      })),
      volumes: [],
      options: {
        insurance_value: input.totalValue,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: false,
        platform: process.env.MELHOR_ENVIO_APP_NAME ?? 'App',
        tags: [{ tag: input.orderId, url: null }],
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro ao adicionar ao carrinho (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { id: string }
  return data.id
}

export async function checkoutCart(meOrderIds: string[]): Promise<void> {
  const res = await fetch(`${baseUrl()}/me/checkout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orders: meOrderIds }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro no checkout (${res.status}): ${text}`)
  }
}

export async function generateLabel(meOrderIds: string[]): Promise<void> {
  const res = await fetch(`${baseUrl()}/me/shipment/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orders: meOrderIds }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Melhor Envio: erro ao gerar etiqueta (${res.status}): ${text}`)
  }
}

export async function getTrackingCode(meOrderId: string): Promise<string | null> {
  const res = await fetch(`${baseUrl()}/me/shipment/tracking?orders[]=${meOrderId}`, {
    headers: authHeaders(),
  })

  if (!res.ok) return null

  const data = (await res.json()) as Record<string, { tracking?: string }>
  return data[meOrderId]?.tracking ?? null
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

  const data = (await res.json()) as { url: string }
  return data.url
}
