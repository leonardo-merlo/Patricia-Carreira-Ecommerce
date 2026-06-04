import { createServiceClient } from '@/lib/supabase/service'

function parsePeriod(period: string): {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  label: string
} {
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
}

export type MonthlyPoint = { month: string; value: number }
export type CategoryItem = { name: string; value: number; pct: number; color: string }
export type TopProductItem = { name: string; units: number; rev: number }

export type ReportData = {
  period_label: string
  kpis: ReportKPIs
  monthly_revenue: MonthlyPoint[]
  by_category: CategoryItem[]
  top_products: TopProductItem[]
  channels: { retail: number; wholesale: number }
  client_stats: { retail_unique: number; wholesale_active: number }
}

const CAT_COLORS: Record<string, string> = {
  bolsas: '#c97d60',
  roupas: '#7c3aed',
  acessorios: '#d8c89a',
}

const CAT_LABELS: Record<string, string> = {
  bolsas: 'Bolsas',
  roupas: 'Roupas',
  acessorios: 'Acessórios',
}

export async function getReportData(period: string): Promise<ReportData> {
  const supabase = createServiceClient()
  const { start, end, prevStart, prevEnd, label } = parsePeriod(period)

  // Chart covers the 12 months ending at `end`
  const chartStart = new Date(end.getFullYear(), end.getMonth() - 11, 1)

  const [curRes, prevRes, chartRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_amount, type, customer_id')
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

  if (ids.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('quantity, unit_price, product_name, product_variant:product_variants(product:products(category))')
      .in('order_id', ids)

    const catMap = new Map<string, number>()
    const prodMap = new Map<string, { units: number; rev: number }>()

    for (const item of itemsData ?? []) {
      const qty = Number(item.quantity)
      const rev = qty * Number(item.unit_price)
      const pv = item.product_variant as unknown as { product: { category: string } | null } | null
      const cat = pv?.product?.category ?? 'outros'
      const name = item.product_name as string

      catMap.set(cat, (catMap.get(cat) ?? 0) + rev)
      const pe = prodMap.get(name) ?? { units: 0, rev: 0 }
      pe.units += qty
      pe.rev += rev
      prodMap.set(name, pe)
    }

    const totalCat = Array.from(catMap.values()).reduce((s, v) => s + v, 0)
    by_category = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, value]) => ({
        name: CAT_LABELS[cat] ?? cat,
        value,
        pct: totalCat > 0 ? Math.round((value / totalCat) * 1000) / 10 : 0,
        color: CAT_COLORS[cat] ?? '#9ca3af',
      }))

    top_products = Array.from(prodMap.entries())
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 5)
      .map(([name, s]) => ({ name, units: s.units, rev: s.rev }))
  }

  const retailRev = cur
    .filter((o) => (o.type as string) === 'retail')
    .reduce((s, o) => s + Number(o.total_amount), 0)
  const wholesaleRev = cur
    .filter((o) => (o.type as string) === 'wholesale')
    .reduce((s, o) => s + Number(o.total_amount), 0)

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
    },
    monthly_revenue,
    by_category,
    top_products,
    channels: { retail: retailRev, wholesale: wholesaleRev },
    client_stats: { retail_unique: retailSet.size, wholesale_active: wholesaleSet.size },
  }
}
