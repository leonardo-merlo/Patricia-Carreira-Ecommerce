import { createServiceClient } from '@/lib/supabase/service'

export type CustomerOrderSummary = {
  num: string
  date: string
  total: number
  status: string
  payment_status: string
}

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
  recent_orders: CustomerOrderSummary[]
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

    const recent_orders: CustomerOrderSummary[] = stats.orders.slice(0, 5).map((o) => {
      const d = new Date(o.created_at as string)
      const shortId = (o.id as string).replace(/-/g, '').slice(-4).toUpperCase()
      return {
        num: `V-${shortId}`,
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        total: Number(o.total_amount),
        status: o.status as string,
        payment_status: o.payment_status as string,
      }
    })

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
      recent_orders,
    }
  })
}
