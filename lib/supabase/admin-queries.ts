import { createServiceClient } from '@/lib/supabase/service'
import type { ProductWithVariants } from '@/lib/types'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardKPIs = {
  orders_today: number
  revenue_month: number
  low_stock_count: number
  open_ops: number
}

export type DashboardOrderRow = {
  id: string
  date: string
  time: string
  customer_name: string
  type: 'Varejo' | 'Atacado'
  total: number
  status: string
}

export type DashboardCriticalItem = {
  id: string
  name: string
  sku: string
  current: number
  category: string
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const supabase = createServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todayRes, revenueRes, opsRes, lowRes] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),

    supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', startOfMonth.toISOString()),

    supabase
      .from('production_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'materials_checked', 'approved', 'in_progress']),

    supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true })
      .lte('stock_quantity', 3),
  ])

  const revenue = (revenueRes.data ?? []).reduce(
    (sum, o) => sum + Number(o.total_amount),
    0,
  )

  return {
    orders_today: todayRes.count ?? 0,
    revenue_month: revenue,
    low_stock_count: lowRes.count ?? 0,
    open_ops: opsRes.count ?? 0,
  }
}

export async function getDashboardRecentOrders(limit = 7): Promise<DashboardOrderRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, type, total_amount, status, customer:customers(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getDashboardRecentOrders]', error)
    return []
  }

  return (data ?? []).map((o) => {
    const d = new Date(o.created_at as string)
    return {
      id: o.id as string,
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      customer_name: (o.customer as unknown as { name: string } | null)?.name ?? 'Cliente',
      type: (o.type as string) === 'retail' ? 'Varejo' : 'Atacado',
      total: Number(o.total_amount),
      status: o.status as string,
    }
  })
}

export async function getDashboardCriticalStock(limit = 6): Promise<DashboardCriticalItem[]> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('product_variants')
    .select('id, sku, stock_quantity, product:products(name, category)')
    .lte('stock_quantity', 3)
    .order('stock_quantity', { ascending: true })
    .limit(limit)

  return (data ?? []).map((v) => {
    const p = v.product as unknown as { name: string; category: string } | null
    const parts = (v.sku as string).split('-')
    const variantSuffix = parts.slice(-2).join(' ')
    return {
      id: v.id as string,
      name: p ? `${p.name} — ${variantSuffix}` : (v.sku as string),
      sku: v.sku as string,
      current: Number(v.stock_quantity),
      category: p?.category ?? '',
    }
  })
}

// ─── Estoque ──────────────────────────────────────────────────────────────────

export async function getAllProductsWithVariants(): Promise<ProductWithVariants[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .order('name', { ascending: true })

  if (error) {
    console.error('[getAllProductsWithVariants]', error)
    return []
  }

  return (data ?? []) as ProductWithVariants[]
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

export type RetailOrderItemRow = {
  id: string
  name: string
  sku: string
  quantity: number
  unit_price: number
}

export type RetailOrderRow = {
  id: string
  display_num: string
  date: string
  customer_name: string
  customer_location: string
  item_count: number
  total: number
  payment_method: string | null
  status: string
  items: RetailOrderItemRow[]
  address: {
    street: string
    number: string
    complement: string | null
    neighborhood: string
    city: string
    state: string
    zip: string
  } | null
}

export async function getRetailOrders(limit = 50): Promise<RetailOrderRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, created_at, total_amount, status, payment_method,
      customer:customers(name, address),
      items:order_items(
        id, quantity, unit_price,
        product_variant:product_variants(
          sku, size, color,
          product:products(name)
        )
      )
    `)
    .eq('type', 'retail')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRetailOrders]', error)
    return []
  }

  return (data ?? []).map((o) => {
    const d = new Date(o.created_at as string)
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

    type CustomerRaw = { name: string; address: Record<string, string> | null } | null
    const customer = o.customer as unknown as CustomerRaw
    const address = customer?.address as RetailOrderRow['address'] | null

    type ItemVariant = {
      sku: string; size: string | null; color: string | null
      product: { name: string } | null
    } | null
    type ItemRaw = { id: string; quantity: number; unit_price: number; product_variant: ItemVariant }

    const items = ((o.items as unknown as ItemRaw[]) ?? []).map((it) => {
      const v = it.product_variant
      const productName = v?.product?.name ?? 'Produto'
      const variantParts = [v?.color, v?.size].filter(Boolean).join(' — ')
      return {
        id: it.id,
        name: variantParts ? `${productName} — ${variantParts}` : productName,
        sku: v?.sku ?? '',
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
      }
    })

    const location = address
      ? `${address.city}/${address.state}`
      : '—'

    const shortId = (o.id as string).replace(/-/g, '').slice(-4).toUpperCase()

    return {
      id: o.id as string,
      display_num: `V-${shortId}`,
      date: dateStr,
      customer_name: customer?.name ?? 'Cliente',
      customer_location: location,
      item_count: items.length,
      total: Number(o.total_amount),
      payment_method: o.payment_method as string | null,
      status: o.status as string,
      items,
      address,
    }
  })
}
