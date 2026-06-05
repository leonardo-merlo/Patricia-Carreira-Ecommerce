import { createServiceClient } from '@/lib/supabase/service'
import type { ProductWithVariants } from '@/lib/types'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardKPIs = {
  orders_today: number
  revenue_month: number
  open_orders: number
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

  const [todayRes, revenueRes, opsRes, lowRes, openRes] = await Promise.all([
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

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'delivered')
      .neq('status', 'cancelled'),
  ])

  const revenue = (revenueRes.data ?? []).reduce(
    (sum, o) => sum + Number(o.total_amount),
    0,
  )

  return {
    orders_today: todayRes.count ?? 0,
    revenue_month: revenue,
    open_orders: openRes.count ?? 0,
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
  payment_status: string
  status: string
  tracking_code: string | null
  melhor_envio_order_id: string | null
  nfe_url: string | null
  nfe_number: string | null
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
      id, created_at, total_amount, status, payment_status, payment_method, tracking_code, nfe_url, nfe_number,
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
      payment_status: (o.payment_status as string) ?? 'pending',
      status: o.status as string,
      tracking_code: (o.tracking_code as string | null) ?? null,
      melhor_envio_order_id: null,
      nfe_url: (o.nfe_url as string | null) ?? null,
      nfe_number: (o.nfe_number as string | null) ?? null,
      items,
      address,
    }
  })
}

// ─── Matérias-primas ─────────────────────────────────────────────────────────

export type RawMaterialRow = {
  id: string
  name: string
  type: 'bruta' | 'intermediaria'
  category: string
  subcategory: string | null
  color: string | null
  unit: string
  stock_quantity: number
  minimum_stock: number
  cost_per_unit: number | null
  supplier: string | null
  notes: string | null
}

export async function getRawMaterials(): Promise<RawMaterialRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('raw_materials')
    .select('id, name, type, category, subcategory, color, unit, stock_quantity, minimum_stock, cost_per_unit, supplier, notes')
    .order('category')
    .order('name')

  if (error) {
    console.error('[getRawMaterials]', error)
    return []
  }

  return (data ?? []).map((r) => ({
    ...r,
    stock_quantity: Number(r.stock_quantity),
    minimum_stock: Number(r.minimum_stock),
    cost_per_unit: r.cost_per_unit != null ? Number(r.cost_per_unit) : null,
  })) as RawMaterialRow[]
}

export type BOMEntry = {
  id: string
  quantity_needed: number
  material: {
    id: string
    name: string
    unit: string
    stock_quantity: number
    type: string
    cost_per_unit: number | null
  }
}

export type VariantWithBOM = {
  id: string
  sku: string
  label: string
  product_name: string
  bom: BOMEntry[]
}

export async function getAllVariantsWithBOM(): Promise<VariantWithBOM[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select(`
      id, sku, size, color,
      product:products(name),
      bom:bill_of_materials(
        id, quantity_needed,
        material:raw_materials(id, name, unit, stock_quantity, type, cost_per_unit)
      )
    `)
    .order('sku')

  if (error) {
    console.error('[getAllVariantsWithBOM]', error)
    return []
  }

  type Raw = {
    id: string; sku: string; size: string | null; color: string | null
    product: { name: string } | null
    bom: Array<{
      id: string; quantity_needed: string
      material: { id: string; name: string; unit: string; stock_quantity: string; type: string; cost_per_unit: string | null } | null
    }>
  }

  return ((data ?? []) as unknown as Raw[]).map((v) => {
    const parts = [v.color, v.size].filter(Boolean).join(' — ')
    const productName = v.product?.name ?? ''
    return {
      id: v.id,
      sku: v.sku,
      label: parts ? `${productName} — ${parts}` : productName,
      product_name: productName,
      bom: (v.bom ?? [])
        .filter((b) => b.material != null)
        .map((b) => ({
          id: b.id,
          quantity_needed: Number(b.quantity_needed),
          material: {
            id: b.material!.id,
            name: b.material!.name,
            unit: b.material!.unit,
            stock_quantity: Number(b.material!.stock_quantity),
            type: b.material!.type,
            cost_per_unit: b.material!.cost_per_unit != null ? Number(b.material!.cost_per_unit) : null,
          },
        })),
    }
  })
}

// ─── Ordens de produção ───────────────────────────────────────────────────────

export type MissingMaterialEntry = {
  material_id: string
  material_name: string
  needed: number
  available: number
  missing: number
  unit: string
}

export type ProductionOrderItemRow = {
  id: string
  quantity_requested: number
  quantity_produced: number
  materials_sufficient: boolean | null
  missing_materials: MissingMaterialEntry[]
  product_variant_id: string | null
  variant_label: string | null
  output_material_id: string | null
  output_material_name: string | null
}

export type ProductionOrderRow = {
  id: string
  order_id: string | null
  depends_on_op_id: string | null
  customer_name: string | null
  type: 'corte' | 'acabamento' | 'beneficiamento'
  status: string
  notes: string | null
  created_by: string
  created_at: string
  items: ProductionOrderItemRow[]
}

export async function getProductionOrders(limit = 50): Promise<ProductionOrderRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('production_orders')
    .select(`
      id, order_id, depends_on_op_id, type, status, notes, created_by, created_at,
      order:orders(customer:customers(name)),
      items:production_order_items(
        id, quantity_requested, quantity_produced, materials_sufficient, missing_materials,
        product_variant_id, output_material_id,
        variant:product_variants(sku, size, color, product:products(name)),
        output_material:raw_materials(name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getProductionOrders]', error)
    return []
  }

  type ItemRaw = {
    id: string
    quantity_requested: number
    quantity_produced: number
    materials_sufficient: boolean | null
    missing_materials: MissingMaterialEntry[] | null
    product_variant_id: string | null
    output_material_id: string | null
    variant: { sku: string; size: string | null; color: string | null; product: { name: string } | null } | null
    output_material: { name: string } | null
  }

  type OrderRaw = {
    id: string; order_id: string | null; depends_on_op_id: string | null
    type: string; status: string
    notes: string | null; created_by: string; created_at: string
    order: { customer: { name: string } | null } | null
    items: ItemRaw[]
  }

  return ((data ?? []) as unknown as OrderRaw[]).map((o) => ({
    id: o.id,
    order_id: o.order_id,
    depends_on_op_id: o.depends_on_op_id ?? null,
    customer_name: o.order?.customer?.name ?? null,
    type: o.type as 'corte' | 'acabamento' | 'beneficiamento',
    status: o.status,
    notes: o.notes,
    created_by: o.created_by,
    created_at: o.created_at,
    items: (o.items ?? []).map((it) => {
      const v = it.variant
      const variantLabel = v
        ? `${v.product?.name ?? ''} — ${[v.color, v.size].filter(Boolean).join(' ')}`
        : null
      return {
        id: it.id,
        quantity_requested: it.quantity_requested,
        quantity_produced: it.quantity_produced,
        materials_sufficient: it.materials_sufficient,
        missing_materials: it.missing_materials ?? [],
        product_variant_id: it.product_variant_id,
        variant_label: variantLabel,
        output_material_id: it.output_material_id,
        output_material_name: it.output_material?.name ?? null,
      }
    }),
  }))
}

// ─── Atacado ──────────────────────────────────────────────────────────────────

export type WholesaleOrderRow = {
  id: string
  display_num: string
  date: string
  customer_name: string
  customer_cnpj: string | null
  item_count: number
  total: number
  status: string
  notes: string | null
}

export async function getWholesaleOrders(limit = 50): Promise<WholesaleOrderRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, created_at, total_amount, status, notes,
      customer:customers(name, cpf_cnpj),
      items:order_items(id)
    `)
    .eq('type', 'wholesale')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getWholesaleOrders]', error)
    return []
  }

  type OrderRaw = {
    id: string; created_at: string; total_amount: string
    status: string; notes: string | null
    customer: { name: string; cpf_cnpj: string | null } | null
    items: { id: string }[]
  }

  return ((data ?? []) as unknown as OrderRaw[]).map((o) => {
    const d = new Date(o.created_at)
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const shortId = o.id.replace(/-/g, '').slice(-4).toUpperCase()
    return {
      id: o.id,
      display_num: `A-${shortId}`,
      date: dateStr,
      customer_name: o.customer?.name ?? '—',
      customer_cnpj: o.customer?.cpf_cnpj ?? null,
      item_count: o.items?.length ?? 0,
      total: Number(o.total_amount),
      status: o.status,
      notes: o.notes,
    }
  })
}

export type WholesaleCustomer = {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
}

export async function getWholesaleCustomers(): Promise<WholesaleCustomer[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, cpf_cnpj, phone, email')
    .eq('type', 'wholesale')
    .order('name')

  if (error) {
    console.error('[getWholesaleCustomers]', error)
    return []
  }

  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    cnpj: (c.cpf_cnpj as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
    email: (c.email as string | null) ?? null,
  }))
}

export type WholesaleVariant = {
  id: string
  sku: string
  label: string
  wholesale_price: number
  stock_quantity: number
  product_id: string
  product_name: string
}

export async function getWholesaleVariants(): Promise<WholesaleVariant[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, sku, size, color, stock_quantity, product:products(id, name, wholesale_price)')
    .order('sku')

  if (error) {
    console.error('[getWholesaleVariants]', error)
    return []
  }

  type Raw = {
    id: string; sku: string; size: string | null; color: string | null; stock_quantity: string
    product: { id: string; name: string; wholesale_price: string | null } | null
  }

  return ((data ?? []) as unknown as Raw[])
    .filter((v) => v.product?.wholesale_price != null)
    .map((v) => {
      const parts = [v.color, v.size].filter(Boolean).join(' — ')
      return {
        id: v.id,
        sku: v.sku,
        label: `${v.product!.name} — ${parts || 'Único'}`,
        wholesale_price: Number(v.product!.wholesale_price),
        stock_quantity: Number(v.stock_quantity),
        product_id: v.product!.id,
        product_name: v.product!.name,
      }
    })
}

// ─── Compras Pendentes ────────────────────────────────────────────────────────

export type PurchaseRequestRow = {
  id: string
  order_id: string | null
  raw_material_id: string | null
  material_name: string
  quantity_needed: number
  unit: string
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  notes: string | null
  created_at: string
  order_display_num: string | null
}

export async function getPurchaseRequests(): Promise<PurchaseRequestRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('purchase_requests')
    .select('id, order_id, raw_material_id, material_name, quantity_needed, unit, status, notes, created_at')
    .not('status', 'in', '("received","cancelled")')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPurchaseRequests]', error)
    return []
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const d = new Date(r.created_at as string)
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const orderId = r.order_id as string | null
    const shortId = orderId?.replace(/-/g, '').slice(-4).toUpperCase()
    return {
      id: r.id as string,
      order_id: orderId,
      raw_material_id: (r.raw_material_id as string | null) ?? null,
      material_name: r.material_name as string,
      quantity_needed: Number(r.quantity_needed),
      unit: r.unit as string,
      status: r.status as 'pending' | 'ordered' | 'received' | 'cancelled',
      notes: (r.notes as string | null) ?? null,
      created_at: dateStr,
      order_display_num: shortId ? `A-${shortId}` : null,
    }
  })
}

// ─── Sidebar counts ───────────────────────────────────────────────────────────

export async function getSidebarCounts(): Promise<{ open_orders: number; low_stock: number }> {
  const supabase = createServiceClient()

  const [ordersRes, stockRes] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'delivered')
      .neq('status', 'cancelled'),

    supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true })
      .lte('stock_quantity', 3),
  ])

  return {
    open_orders: ordersRes.count ?? 0,
    low_stock: stockRes.count ?? 0,
  }
}
