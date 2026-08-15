import { createServiceClient } from '@/lib/supabase/service'

export type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  instagram: string | null
  type: 'retail' | 'wholesale'
  address: {
    street?: string
    number?: string
    complement?: string | null
    neighborhood?: string
    city?: string
    state?: string
    zip?: string
  } | null
  created_at: string
  order_count: number
  total_spent: number
  last_order_at: string | null
}

// ─── Detalhe de compras de um cliente ────────────────────────────────────────
//
// Carregado sob demanda, quando a ficha do cliente abre. Trazer os itens de todos
// os pedidos de todos os clientes junto com a lista seria caro e quase sempre
// desperdício: o Henrique abre uma ficha por vez.

export type CustomerOrderItem = {
  id: string
  name: string
  sku: string
  quantity: number
  unit_price: number
}

export type CustomerOrderDetail = {
  id: string
  num: string
  date: string
  total: number
  status: string
  payment_status: string
  items: CustomerOrderItem[]
}

export type CustomerTopProduct = {
  variant_id: string
  name: string
  sku: string
  quantity: number
  total_spent: number
  order_count: number
}

export type CustomerPurchaseDetail = {
  orders: CustomerOrderDetail[]
  top_products: CustomerTopProduct[]
}

type VariantRaw = {
  id: string
  sku: string
  size: string | null
  color: string | null
  product: { name: string } | null
} | null

type OrderItemRaw = {
  id: string
  quantity: number
  unit_price: number
  product_variant: VariantRaw
}

type OrderDetailRaw = {
  id: string
  type: string
  created_at: string
  total_amount: number
  status: string
  payment_status: string
  items: OrderItemRaw[]
}

function variantDisplayName(v: VariantRaw): string {
  const productName = v?.product?.name ?? 'Produto'
  const variantParts = [v?.color, v?.size].filter(Boolean).join(' — ')
  return variantParts ? `${productName} — ${variantParts}` : productName
}

export async function getCustomerPurchaseDetail(
  customerId: string,
  orderLimit = 10,
): Promise<CustomerPurchaseDetail> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, type, created_at, total_amount, status, payment_status,
      items:order_items(
        id, quantity, unit_price,
        product_variant:product_variants(
          id, sku, size, color,
          product:products(name)
        )
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCustomerPurchaseDetail]', error)
    return { orders: [], top_products: [] }
  }

  const rows = (data ?? []) as unknown as OrderDetailRaw[]

  const orders: CustomerOrderDetail[] = rows.slice(0, orderLimit).map((o) => {
    const d = new Date(o.created_at)
    const shortId = o.id.replace(/-/g, '').slice(-4).toUpperCase()
    return {
      id: o.id,
      num: `${o.type === 'wholesale' ? 'A' : 'V'}-${shortId}`,
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      total: Number(o.total_amount),
      status: o.status,
      payment_status: o.payment_status,
      items: (o.items ?? []).map((it) => ({
        id: it.id,
        name: variantDisplayName(it.product_variant),
        sku: it.product_variant?.sku ?? '',
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
      })),
    }
  })

  // Só pedido pago entra no ranking — é a mesma regra do "Total comprado" que
  // aparece no topo da ficha, e sem isso os dois números se contradiriam.
  const ranking = new Map<string, CustomerTopProduct>()

  for (const o of rows) {
    if (o.payment_status !== 'paid') continue
    for (const it of o.items ?? []) {
      const v = it.product_variant
      if (!v) continue
      const entry = ranking.get(v.id) ?? {
        variant_id: v.id,
        name: variantDisplayName(v),
        sku: v.sku,
        quantity: 0,
        total_spent: 0,
        order_count: 0,
      }
      entry.quantity += it.quantity
      entry.total_spent += Number(it.unit_price) * it.quantity
      entry.order_count += 1
      ranking.set(v.id, entry)
    }
  }

  const top_products = Array.from(ranking.values()).sort(
    (a, b) => b.quantity - a.quantity || b.total_spent - a.total_spent,
  )

  return { orders, top_products }
}

export async function getCustomers(): Promise<CustomerRow[]> {
  const supabase = createServiceClient()

  const [custRes, ordersRes] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, email, phone, cpf_cnpj, instagram, type, address, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, customer_id, total_amount, status, payment_status, created_at')
      .not('customer_id', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  if (custRes.error) {
    console.error('[getCustomers]', custRes.error)
    return []
  }

  const allOrders = ordersRes.data ?? []

  type OrderEntry = { orders: typeof allOrders; total: number }
  const orderMap = new Map<string, OrderEntry>()

  for (const o of allOrders) {
    const cid = o.customer_id as string
    const entry = orderMap.get(cid) ?? { orders: [], total: 0 }
    entry.orders.push(o)
    if ((o.payment_status as string) === 'paid') {
      entry.total += Number(o.total_amount)
    }
    orderMap.set(cid, entry)
  }

  return (custRes.data ?? []).map((c) => {
    const stats = orderMap.get(c.id as string) ?? { orders: [], total: 0 }

    return {
      id: c.id as string,
      name: c.name as string,
      email: (c.email as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      cpf_cnpj: (c.cpf_cnpj as string | null) ?? null,
      instagram: (c.instagram as string | null) ?? null,
      type: c.type as 'retail' | 'wholesale',
      address: c.address as CustomerRow['address'],
      created_at: c.created_at as string,
      order_count: stats.orders.length,
      total_spent: stats.total,
      last_order_at: (stats.orders[0]?.created_at as string) ?? null,
    }
  })
}
