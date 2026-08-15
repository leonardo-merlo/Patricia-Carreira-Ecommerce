import { createServiceClient } from '@/lib/supabase/service'
import { categoryLabel, assignCategoryColors } from '@/lib/categories'

/** `custom:YYYY-MM-DD:YYYY-MM-DD` — intervalo escolhido à mão. */
export function isCustomPeriod(period: string): boolean {
  return /^custom:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(period)
}

export function parseCustomPeriod(period: string): { de: string; ate: string } | null {
  if (!isCustomPeriod(period)) return null
  const [, de, ate] = period.split(':')
  return { de, ate }
}

function parsePeriod(period: string): {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  label: string
} {
  const custom = parseCustomPeriod(period)
  if (custom) {
    const start = new Date(`${custom.de}T00:00:00`)
    const end = new Date(`${custom.ate}T23:59:59.999`)
    // O período anterior tem a mesma duração, colado antes do início — é o que
    // torna a comparação honesta para um intervalo de tamanho qualquer.
    const spanMs = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - spanMs)
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return { start, end, prevStart, prevEnd, label: `${fmt(start)} a ${fmt(end)}` }
  }

  if (period === 'last90') {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(start.getDate() - 89)
    start.setHours(0, 0, 0, 0)
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    prevEnd.setHours(23, 59, 59, 999)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - 89)
    prevStart.setHours(0, 0, 0, 0)
    return { start, end, prevStart, prevEnd, label: 'Últimos 90 dias' }
  }

  if (/^\d{4}$/.test(period)) {
    const year = parseInt(period)
    return {
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
      prevStart: new Date(year - 1, 0, 1, 0, 0, 0, 0),
      prevEnd: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      label: `Ano ${year}`,
    }
  }

  // YYYY-MM
  const [yearStr, monthStr] = period.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr) - 1
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevStart = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0)
  const prevEnd = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999)
  const raw = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const label = raw.charAt(0).toUpperCase() + raw.slice(1)
  return { start, end, prevStart, prevEnd, label }
}

export function getPrevPeriodLabel(period: string): string {
  if (isCustomPeriod(period)) return 'período anterior'
  if (period === 'last90') return '90 dias antes'
  if (/^\d{4}$/.test(period)) return String(parseInt(period) - 1)
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

export type ReportKPIs = {
  revenue: number
  revenue_delta_pct: number | null
  avg_ticket: number
  avg_ticket_delta_pct: number | null
  order_count: number
  order_count_delta_pct: number | null
  /** Peças vendidas — pedido grande e pedido pequeno contam diferente. */
  items_sold: number
}

export type MonthlyPoint = { month: string; value: number }
export type CategoryItem = { name: string; value: number; units: number; pct: number; color: string }
export type TopProductItem = { name: string; units: number; rev: number }

export type AffiliateItem = {
  name: string
  coupon_code: string | null
  orders: number
  revenue: number
  commission_pct: number | null
  /** Comissão estimada pela receita do período — o valor a pagar de fato vive em contas a pagar. */
  estimated_commission: number
}

export type ReportData = {
  period_label: string
  kpis: ReportKPIs
  monthly_revenue: MonthlyPoint[]
  by_category: CategoryItem[]
  top_products: TopProductItem[]
  by_affiliate: AffiliateItem[]
  channels: { retail: number; wholesale: number }
  channel_units: { retail: number; wholesale: number }
  client_stats: { retail_unique: number; wholesale_active: number }
}

export async function getReportData(period: string): Promise<ReportData> {
  const supabase = createServiceClient()
  const { start, end, prevStart, prevEnd, label } = parsePeriod(period)

  // Chart covers the 12 months ending at `end`
  const chartStart = new Date(end.getFullYear(), end.getMonth() - 11, 1)

  const [curRes, prevRes, chartRes, partnersRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_amount, type, customer_id, coupon_id')
      .eq('payment_status', 'paid')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),

    supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString()),

    supabase
      .from('orders')
      .select('created_at, total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', chartStart.toISOString())
      .lte('created_at', end.toISOString()),

    // A afiliada é ligada à venda pelo cupom dela: partners.coupon_id casa com
    // orders.coupon_id. Sem cupom aplicado não há como atribuir a venda.
    supabase
      .from('partners')
      .select('id, name, commission_pct, coupon_id, coupon:coupons(code)')
      .not('coupon_id', 'is', null),
  ])

  const cur = curRes.data ?? []
  const prev = prevRes.data ?? []

  const revenue = cur.reduce((s, o) => s + Number(o.total_amount), 0)
  const prevRevenue = prev.reduce((s, o) => s + Number(o.total_amount), 0)
  const orderCount = cur.length
  const prevOrderCount = prev.length
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0
  const prevAvgTicket = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

  // Monthly chart (12 months ending at `end`)
  const monthlyMap = new Map<string, number>()
  for (const o of chartRes.data ?? []) {
    const d = new Date(o.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(o.total_amount))
  }

  const monthly_revenue: MonthlyPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mon = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').slice(0, 3)
    monthly_revenue.push({ month: mon, value: monthlyMap.get(key) ?? 0 })
  }

  // Items for current period → category breakdown + top products
  const ids = cur.map((o) => o.id as string)
  let by_category: CategoryItem[] = []
  let top_products: TopProductItem[] = []
  let items_sold = 0
  const unitsByOrder = new Map<string, number>()

  if (ids.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, unit_price, product_name, product_variant:product_variants(product:products(category))')
      .in('order_id', ids)

    const catMap = new Map<string, { value: number; units: number }>()
    const prodMap = new Map<string, { units: number; rev: number }>()

    for (const item of itemsData ?? []) {
      const qty = Number(item.quantity)
      const rev = qty * Number(item.unit_price)
      const pv = item.product_variant as unknown as { product: { category: string } | null } | null
      const cat = pv?.product?.category ?? 'outros'
      const name = item.product_name as string

      items_sold += qty
      const orderId = item.order_id as string
      unitsByOrder.set(orderId, (unitsByOrder.get(orderId) ?? 0) + qty)

      const ce = catMap.get(cat) ?? { value: 0, units: 0 }
      ce.value += rev
      ce.units += qty
      catMap.set(cat, ce)

      const pe = prodMap.get(name) ?? { units: 0, rev: 0 }
      pe.units += qty
      pe.rev += rev
      prodMap.set(name, pe)
    }

    const totalCat = Array.from(catMap.values()).reduce((s, v) => s + v.value, 0)
    // Cores atribuídas de uma vez para o conjunto, não uma a uma: é o que impede
    // duas categorias do mesmo gráfico de saírem com a mesma cor.
    const colors = assignCategoryColors(Array.from(catMap.keys()))
    by_category = Array.from(catMap.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .map(([cat, s]) => ({
        name: categoryLabel(cat),
        value: s.value,
        units: s.units,
        pct: totalCat > 0 ? Math.round((s.value / totalCat) * 1000) / 10 : 0,
        color: colors.get(cat) ?? '#9ca3af',
      }))

    top_products = Array.from(prodMap.entries())
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 8)
      .map(([name, s]) => ({ name, units: s.units, rev: s.rev }))
  }

  // ── Receita por afiliada ───────────────────────────────────────────────────
  type PartnerRaw = {
    id: string
    name: string
    commission_pct: number | null
    coupon_id: string
    coupon: { code: string } | { code: string }[] | null
  }
  const partners = (partnersRes.data ?? []) as unknown as PartnerRaw[]
  const partnerByCoupon = new Map(partners.map((p) => [p.coupon_id, p]))

  const affiliateMap = new Map<string, { orders: number; revenue: number }>()
  for (const o of cur) {
    const couponId = o.coupon_id as string | null
    if (!couponId || !partnerByCoupon.has(couponId)) continue
    const entry = affiliateMap.get(couponId) ?? { orders: 0, revenue: 0 }
    entry.orders += 1
    entry.revenue += Number(o.total_amount)
    affiliateMap.set(couponId, entry)
  }

  const by_affiliate: AffiliateItem[] = Array.from(affiliateMap.entries())
    .map(([couponId, s]) => {
      const p = partnerByCoupon.get(couponId)!
      const coupon = Array.isArray(p.coupon) ? p.coupon[0] : p.coupon
      const pct = p.commission_pct != null ? Number(p.commission_pct) : null
      return {
        name: p.name,
        coupon_code: coupon?.code ?? null,
        orders: s.orders,
        revenue: s.revenue,
        commission_pct: pct,
        estimated_commission: pct != null ? (s.revenue * pct) / 100 : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const retailRev = cur
    .filter((o) => (o.type as string) === 'retail')
    .reduce((s, o) => s + Number(o.total_amount), 0)
  const wholesaleRev = cur
    .filter((o) => (o.type as string) === 'wholesale')
    .reduce((s, o) => s + Number(o.total_amount), 0)

  const retailUnits = cur
    .filter((o) => (o.type as string) === 'retail')
    .reduce((s, o) => s + (unitsByOrder.get(o.id as string) ?? 0), 0)
  const wholesaleUnits = cur
    .filter((o) => (o.type as string) === 'wholesale')
    .reduce((s, o) => s + (unitsByOrder.get(o.id as string) ?? 0), 0)

  const retailSet = new Set(
    cur
      .filter((o) => (o.type as string) === 'retail' && o.customer_id)
      .map((o) => o.customer_id as string),
  )
  const wholesaleSet = new Set(
    cur
      .filter((o) => (o.type as string) === 'wholesale' && o.customer_id)
      .map((o) => o.customer_id as string),
  )

  return {
    period_label: label,
    kpis: {
      revenue,
      revenue_delta_pct: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      avg_ticket: avgTicket,
      avg_ticket_delta_pct: prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : null,
      order_count: orderCount,
      order_count_delta_pct:
        prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : null,
      items_sold,
    },
    monthly_revenue,
    by_category,
    top_products,
    by_affiliate,
    channels: { retail: retailRev, wholesale: wholesaleRev },
    channel_units: { retail: retailUnits, wholesale: wholesaleUnits },
    client_stats: { retail_unique: retailSet.size, wholesale_active: wholesaleSet.size },
  }
}
