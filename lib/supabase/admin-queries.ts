import { createServiceClient } from '@/lib/supabase/service'
import { getResolvedBomForVariants } from '@/lib/supabase/bom'
import type {
  ProductWithVariants, ProductVariant, CutCategory,
  CutCategoryRow, MaterialColor, VariantCutColor,
} from '@/lib/types'

/** Cores de produção da variante — resolvem os cortes da receita do produto. */
export type ProductVariantWithColors = ProductVariant & {
  cut_colors: VariantCutColor[]
}

export type ProductBomEntry = {
  id: string
  raw_material_id: string | null
  material_category: CutCategory | null
  material_type: string | null
  quantity_needed: number
}

export type ProductWithVariantsAndBom = Omit<ProductWithVariants, 'variants'> & {
  variants: ProductVariantWithColors[]
  bom: ProductBomEntry[]
}

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
      .in('status', ['draft', 'approved', 'in_progress']),

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

export async function getAllProductsWithVariants(): Promise<ProductWithVariantsAndBom[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      '*, variants:product_variants(*, cut_colors:variant_cut_colors(category, color)), bom:bill_of_materials(id, raw_material_id, material_category, material_type, quantity_needed)',
    )
    .order('name', { ascending: true })

  if (error) {
    console.error('[getAllProductsWithVariants]', error)
    return []
  }

  return (data ?? []) as unknown as ProductWithVariantsAndBom[]
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
  nfe_status: string
  nfe_access_key: string | null
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
      id, created_at, total_amount, status, payment_status, payment_method, tracking_code, melhor_envio_order_id, nfe_url, nfe_number, nfe_status, nfe_access_key,
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
      melhor_envio_order_id: (o.melhor_envio_order_id as string | null) ?? null,
      nfe_url: (o.nfe_url as string | null) ?? null,
      nfe_number: (o.nfe_number as string | null) ?? null,
      nfe_status: (o.nfe_status as string) ?? 'pending',
      nfe_access_key: (o.nfe_access_key as string | null) ?? null,
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
  type_specific: string | null
  state: string | null
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
    .select('id, name, type, category, subcategory, type_specific, state, color, unit, stock_quantity, minimum_stock, cost_per_unit, supplier, notes')
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

/** Categorias de corte ativas, na ordem de exibição. */
export async function getCutCategories(): Promise<CutCategoryRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cut_categories')
    .select('category, label, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[getCutCategories]', error)
    return []
  }

  return (data ?? []) as CutCategoryRow[]
}

/** Uma opção do seletor de insumo da receita. */
export type RecipeMaterialOption = {
  /** id de raw_materials nos de cor fixa; null nos cortes. */
  raw_material_id: string | null
  category: string
  type: string
  unit: string
  is_cut: boolean
}

/**
 * Opções do seletor "+ Adicionar insumo" da receita.
 *
 * Cortes NÃO saem de raw_materials: lá o insumo é por (peça, cor), e a receita
 * quer a peça sem cor. Saem dos tipos já usados em qualquer receita — é o que
 * torna as peças já cadastradas reusáveis num produto novo.
 */
export async function getRecipeMaterialOptions(): Promise<RecipeMaterialOption[]> {
  const supabase = createServiceClient()

  const { data: cutCategoryRows } = await supabase.from('cut_categories').select('category')
  const cutCategories = (cutCategoryRows ?? []).map((c) => c.category as string)

  const [fixedRes, cutRes] = await Promise.all([
    supabase
      .from('raw_materials')
      .select('id, category, type_specific, name, unit')
      .not('category', 'in', `("${cutCategories.join('","')}")`)
      .order('category')
      .order('name'),
    supabase
      .from('bill_of_materials')
      .select('material_category, material_type')
      .not('material_category', 'is', null),
  ])

  if (fixedRes.error) console.error('[getRecipeMaterialOptions:fixed]', fixedRes.error)
  if (cutRes.error) console.error('[getRecipeMaterialOptions:cut]', cutRes.error)

  const fixed: RecipeMaterialOption[] = (fixedRes.data ?? []).map((m) => ({
    raw_material_id: m.id as string,
    category: m.category as string,
    type: (m.type_specific as string | null) ?? (m.name as string),
    unit: m.unit as string,
    is_cut: false,
  }))

  const seen = new Set<string>()
  const cuts: RecipeMaterialOption[] = []
  for (const row of cutRes.data ?? []) {
    const category = row.material_category as string
    const type = row.material_type as string
    const key = `${category}||${type}`
    if (seen.has(key)) continue
    seen.add(key)
    cuts.push({ raw_material_id: null, category, type, unit: 'unidade', is_cut: true })
  }
  cuts.sort((a, b) => a.category.localeCompare(b.category) || a.type.localeCompare(b.type))

  return [...cuts, ...fixed]
}

/** Paleta completa. O cliente filtra por categoria na hora de montar o dropdown. */
export async function getMaterialColors(): Promise<MaterialColor[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('material_colors')
    .select('id, category, name, hex, is_placeholder, is_active, sort_order')
    .eq('is_active', true)
    .order('category')
    .order('sort_order')
    .order('name')

  if (error) {
    console.error('[getMaterialColors]', error)
    return []
  }

  return (data ?? []) as MaterialColor[]
}

/**
 * Item da receita do produto, já enriquecido com os dados do insumo.
 *
 * Nos cortes, `material.id` é null e `material.stock_quantity` é a soma do
 * estoque em todas as cores — a receita do produto não fixa cor. O saldo da cor
 * concreta aparece na variante, via `resolve_variant_bom`.
 */
export type BOMEntry = {
  id: string
  quantity_needed: number
  material_category: string
  material_type: string | null
  is_cut: boolean
  material: {
    id: string | null
    name: string
    unit: string
    stock_quantity: number
    cost_per_unit: number | null
  }
}

export type ProductWithBOM = {
  id: string
  name: string
  category: string
  variant_count: number
  /** Para o seletor "ver como" da aba Receitas: colore a receita do produto. */
  variants: Array<{ id: string; label: string; cut_colors: VariantCutColor[] }>
  bom: BOMEntry[]
}

/** Corte que a receita exige numa cor que ainda não existe em raw_materials. */
export type PendingCutMaterial = {
  category: string
  type_specific: string
  color: string
  variant_count: number
  products: string
}

export async function getPendingCutMaterials(): Promise<PendingCutMaterial[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('pending_cut_materials')

  if (error) {
    console.error('[getPendingCutMaterials]', error)
    return []
  }

  type Row = Omit<PendingCutMaterial, 'variant_count'> & { variant_count: string | number }
  return ((data ?? []) as Row[]).map((r) => ({
    ...r,
    variant_count: Number(r.variant_count),
  }))
}

export async function getAllProductsWithBOM(): Promise<ProductWithBOM[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, category,
      variants:product_variants(id, sku, size, color, cut_colors:variant_cut_colors(category, color)),
      bom:bill_of_materials(
        id, quantity_needed, material_category, material_type,
        material:raw_materials(id, name, unit, stock_quantity, cost_per_unit)
      )
    `)
    .order('name')

  if (error) {
    console.error('[getAllProductsWithBOM]', error)
    return []
  }

  // Cortes não apontam um insumo: o estoque exibido é a soma das cores.
  const { data: cutRows } = await supabase
    .from('raw_materials')
    .select('category, type_specific, unit, stock_quantity, cost_per_unit')
    .in('category', ['Corte Lona', 'Corte Forro', 'Corte Couro'])

  type CutRow = {
    category: string; type_specific: string | null; unit: string
    stock_quantity: string; cost_per_unit: string | null
  }

  const cutTotals = new Map<string, { unit: string; stock: number; cost: number | null }>()
  for (const c of (cutRows ?? []) as unknown as CutRow[]) {
    const key = `${c.category}||${c.type_specific ?? ''}`
    const prev = cutTotals.get(key)
    cutTotals.set(key, {
      unit: c.unit,
      stock: (prev?.stock ?? 0) + Number(c.stock_quantity),
      cost: c.cost_per_unit != null ? Number(c.cost_per_unit) : prev?.cost ?? null,
    })
  }

  type Raw = {
    id: string; name: string; category: string
    variants: Array<{
      id: string; sku: string; size: string | null; color: string | null
      cut_colors: Array<{ category: string; color: string }> | null
    }>
    bom: Array<{
      id: string; quantity_needed: string
      material_category: string | null; material_type: string | null
      material: {
        id: string; name: string; unit: string
        stock_quantity: string; cost_per_unit: string | null
      } | null
    }>
  }

  return ((data ?? []) as unknown as Raw[]).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    variant_count: (p.variants ?? []).length,
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      label: [v.color, v.size !== 'Único' ? v.size : null].filter(Boolean).join(' — ') || v.sku,
      cut_colors: v.cut_colors ?? [],
    })),
    bom: (p.bom ?? []).map((b) => {
      if (b.material) {
        return {
          id: b.id,
          quantity_needed: Number(b.quantity_needed),
          material_category: b.material_category ?? '',
          material_type: b.material_type,
          is_cut: false,
          material: {
            id: b.material.id,
            name: b.material.name,
            unit: b.material.unit,
            stock_quantity: Number(b.material.stock_quantity),
            cost_per_unit: b.material.cost_per_unit != null ? Number(b.material.cost_per_unit) : null,
          },
        }
      }

      const totals = cutTotals.get(`${b.material_category ?? ''}||${b.material_type ?? ''}`)
      return {
        id: b.id,
        quantity_needed: Number(b.quantity_needed),
        material_category: b.material_category ?? '',
        material_type: b.material_type,
        is_cut: true,
        material: {
          id: null,
          name: b.material_type ?? '',
          unit: totals?.unit ?? 'unidade',
          stock_quantity: totals?.stock ?? 0,
          cost_per_unit: totals?.cost ?? null,
        },
      }
    }),
  }))
}

// ─── Ordens de produção ───────────────────────────────────────────────────────

export type MissingMaterialEntry = {
  material_id: string
  material_name: string
  category: string
  needed: number
  available: number
  missing: number
  unit: string
  /** Cor exigida pela variante (só para cortes); null nos insumos de cor fixa. */
  required_color: string | null
  /** false = o insumo nessa cor ainda não existe em raw_materials. */
  resolved: boolean
}

export type OpMaterial = {
  material_id: string
  material_name: string
  category: string
  type_specific: string | null
  required_color: string | null
  resolved: boolean
  /** true quando a variante ainda está na cor "Indefinida". */
  is_placeholder: boolean
  unit: string
  needed: number
  available: number
  sufficient: boolean
}

export type ProductionOrderRow = {
  id: string
  order_id: string | null
  customer_name: string | null
  product_variant_id: string | null
  variant_sku: string | null
  variant_label: string | null
  quantity_requested: number
  quantity_produced: number
  materials_sufficient: boolean | null
  missing_materials: MissingMaterialEntry[]
  material_checks: Record<string, boolean>
  materials: OpMaterial[]
  status: string
  notes: string | null
  created_by: string
  created_at: string
}

export async function getProductionOrders(limit = 50): Promise<ProductionOrderRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('production_orders')
    .select(`
      id, order_id, product_variant_id, quantity_requested, quantity_produced,
      materials_sufficient, missing_materials, material_checks,
      status, notes, created_by, created_at,
      order:orders(customer:customers(name)),
      variant:product_variants(sku, size, color, product:products(name))
    `)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getProductionOrders]', error)
    return []
  }

  type VariantRaw = {
    sku: string; size: string | null; color: string | null
    product: { name: string } | null
  } | null

  type OrderRaw = {
    id: string; order_id: string | null; product_variant_id: string | null
    quantity_requested: number; quantity_produced: number
    materials_sufficient: boolean | null
    missing_materials: MissingMaterialEntry[] | null
    material_checks: Record<string, boolean> | null
    status: string; notes: string | null; created_by: string; created_at: string
    order: { customer: { name: string } | null } | null
    variant: VariantRaw
  }

  const rows = (data ?? []) as unknown as OrderRaw[]

  // Carrega o BOM (receita) de todas as variantes envolvidas em uma única query
  const variantIds = Array.from(
    new Set(rows.map((o) => o.product_variant_id).filter((id): id is string => Boolean(id))),
  )

  // A receita é do produto; resolve por variante para aplicar as cores dela.
  const bomByVariant = await getResolvedBomForVariants(variantIds)

  return rows.map((o) => {
    const v = o.variant
    const productName = v?.product?.name ?? 'Produto'
    const parts = [v?.color, v?.size].filter(Boolean).join(' — ')
    const variantLabel = parts ? `${productName} — ${parts}` : productName

    const bom = o.product_variant_id ? bomByVariant[o.product_variant_id] ?? [] : []
    const materials: OpMaterial[] = bom.map((line) => {
      const needed = line.quantity_needed * o.quantity_requested
      return {
        material_id: line.raw_material_id ?? '',
        material_name: line.material_name,
        category: line.material_category,
        type_specific: line.material_type,
        required_color: line.required_color,
        resolved: line.resolved,
        is_placeholder: line.is_placeholder,
        unit: line.unit,
        needed,
        available: line.stock_quantity,
        sufficient: line.resolved && line.stock_quantity >= needed,
      }
    })

    return {
      id: o.id,
      order_id: o.order_id,
      customer_name: o.order?.customer?.name ?? null,
      product_variant_id: o.product_variant_id,
      variant_sku: v?.sku ?? null,
      variant_label: variantLabel,
      quantity_requested: o.quantity_requested,
      quantity_produced: o.quantity_produced,
      materials_sufficient: o.materials_sufficient,
      missing_materials: o.missing_materials ?? [],
      material_checks: o.material_checks ?? {},
      materials,
      status: o.status,
      notes: o.notes,
      created_by: o.created_by,
      created_at: o.created_at,
    }
  })
}

// ─── Atacado ──────────────────────────────────────────────────────────────────

export type WholesaleOrderItemRow = {
  id: string
  name: string
  sku: string
  quantity: number
  unit_price: number
}

export type WholesaleOrderRow = {
  id: string
  display_num: string
  date: string
  customer_name: string
  customer_cnpj: string | null
  item_count: number
  total: number
  status: string
  nfe_status: string
  notes: string | null
  items: WholesaleOrderItemRow[]
}

export async function getWholesaleOrders(limit = 50): Promise<WholesaleOrderRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, created_at, total_amount, status, nfe_status, notes,
      customer:customers(name, cpf_cnpj),
      items:order_items(
        id, quantity, unit_price,
        product_variant:product_variants(
          sku, size, color,
          product:products(name)
        )
      )
    `)
    .eq('type', 'wholesale')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getWholesaleOrders]', error)
    return []
  }

  type ItemVariant = {
    sku: string; size: string | null; color: string | null
    product: { name: string } | null
  } | null
  type ItemRaw = { id: string; quantity: number; unit_price: number; product_variant: ItemVariant }

  type OrderRaw = {
    id: string; created_at: string; total_amount: string
    status: string; nfe_status: string | null; notes: string | null
    customer: { name: string; cpf_cnpj: string | null } | null
    items: ItemRaw[]
  }

  return ((data ?? []) as unknown as OrderRaw[]).map((o) => {
    const d = new Date(o.created_at)
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const shortId = o.id.replace(/-/g, '').slice(-4).toUpperCase()

    const items = (o.items ?? []).map((it) => {
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

    return {
      id: o.id,
      display_num: `A-${shortId}`,
      date: dateStr,
      customer_name: o.customer?.name ?? '—',
      customer_cnpj: o.customer?.cpf_cnpj ?? null,
      item_count: items.length,
      total: Number(o.total_amount),
      status: o.status,
      nfe_status: o.nfe_status ?? 'pending',
      notes: o.notes,
      items,
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
  /** Cor do insumo referenciado — null nos insumos sem cor. */
  material_color: string | null
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  notes: string | null
  created_at: string
  order_display_num: string | null
}

export async function getPurchaseRequests(): Promise<PurchaseRequestRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('purchase_requests')
    .select('id, order_id, raw_material_id, material_name, quantity_needed, unit, status, notes, created_at, material:raw_materials(color)')
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
      material_color: (r.material as { color: string | null } | null)?.color ?? null,
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

// ─── Afiliadas ──────────────────────────────────────────────────────────────

const PT_MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export type AffiliateMonthStats = {
  key: string // 'YYYY-MM'
  label: string // 'mai/2026'
  sales: number
  revenue: number
  commission: number
  paid: boolean
}

export type AffiliateRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  couponCode: string | null
  couponId: string | null
  commissionPct: number
  paymentDay: number | null
  isActive: boolean
  joinedDate: string
  months: AffiliateMonthStats[] // desc, mês mais recente primeiro
  salesMonth: number
  revenueMonth: number
  commissionMonth: number
  paidMonth: boolean
  totalSales: number
  totalRevenue: number
  totalCommission: number
}

export async function getAllAffiliatesWithStats(): Promise<AffiliateRow[]> {
  const supabase = createServiceClient()

  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('id, name, contact_name, email, phone, commission_pct, payment_day, coupon_id, is_active, created_at, coupons!coupon_id(code)')
    .eq('type', 'affiliate')
    .order('created_at', { ascending: false })

  if (partnersError || !partners?.length) return []

  type CouponEmbed = { code: string } | null
  type PartnerRow = {
    id: string; name: string; contact_name: string | null; email: string | null; phone: string | null
    commission_pct: number | null; payment_day: number | null; coupon_id: string | null
    is_active: boolean; created_at: string; coupons: unknown
  }

  const couponIds = (partners as PartnerRow[]).map((p) => p.coupon_id).filter((id): id is string => Boolean(id))

  const { data: payables } = await supabase
    .from('accounts_payable')
    .select('partner_id, reference_month, paid_at')
    .in('partner_id', (partners as PartnerRow[]).map((p) => p.id))

  type PayableRow = { partner_id: string; reference_month: string; paid_at: string | null }
  const paidByPartnerMonth = new Map<string, boolean>()
  for (const pay of (payables ?? []) as PayableRow[]) {
    paidByPartnerMonth.set(`${pay.partner_id}:${pay.reference_month}`, pay.paid_at !== null)
  }

  const { data: rawOrders } = couponIds.length
    ? await supabase
        .from('orders')
        .select('coupon_id, created_at, order_items(quantity, unit_price)')
        .in('coupon_id', couponIds)
    : { data: [] }

  type RawOrder = { coupon_id: string; created_at: string; order_items: { quantity: number; unit_price: number }[] }

  const monthsByCoupon = new Map<string, Map<string, { sales: number; revenue: number }>>()
  for (const order of (rawOrders ?? []) as RawOrder[]) {
    const d = new Date(order.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthsByCoupon.has(order.coupon_id)) monthsByCoupon.set(order.coupon_id, new Map())
    const monthMap = monthsByCoupon.get(order.coupon_id)!
    if (!monthMap.has(key)) monthMap.set(key, { sales: 0, revenue: 0 })
    const m = monthMap.get(key)!
    for (const item of order.order_items) {
      m.sales++
      m.revenue += Number(item.unit_price) * item.quantity
    }
  }

  const currentKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  return (partners as PartnerRow[]).map((p) => {
    const couponRaw = p.coupons as unknown
    const coupon = (Array.isArray(couponRaw) ? couponRaw[0] ?? null : couponRaw) as CouponEmbed
    const commissionPct = Number(p.commission_pct) || 10
    const monthMap = p.coupon_id ? monthsByCoupon.get(p.coupon_id) ?? new Map() : new Map()

    const months: AffiliateMonthStats[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, m]) => {
        const [y, mo] = key.split('-')
        const revenue = Math.round(m.revenue * 100) / 100
        return {
          key,
          label: `${PT_MONTHS_SHORT[Number(mo) - 1]}/${y}`,
          sales: m.sales,
          revenue,
          commission: Math.round(revenue * commissionPct) / 100,
          paid: paidByPartnerMonth.get(`${p.id}:${key}`) ?? false,
        }
      })

    const current = months.find((m) => m.key === currentKey) ?? null
    const joined = new Date(p.created_at)

    return {
      id: p.id,
      name: p.contact_name ?? p.name,
      email: p.email,
      phone: p.phone,
      couponCode: coupon?.code ?? null,
      couponId: p.coupon_id,
      commissionPct,
      paymentDay: p.payment_day,
      isActive: p.is_active,
      joinedDate: `${PT_MONTHS_SHORT[joined.getMonth()]}/${joined.getFullYear()}`,
      months,
      salesMonth: current?.sales ?? 0,
      revenueMonth: current?.revenue ?? 0,
      commissionMonth: current?.commission ?? 0,
      paidMonth: current?.paid ?? false,
      totalSales: months.reduce((s, m) => s + m.sales, 0),
      totalRevenue: Math.round(months.reduce((s, m) => s + m.revenue, 0) * 100) / 100,
      totalCommission: Math.round(months.reduce((s, m) => s + m.commission, 0) * 100) / 100,
    }
  })
}
