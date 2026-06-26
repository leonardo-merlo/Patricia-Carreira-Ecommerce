'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

type AffiliateFormData = {
  name: string
  email: string
  phone: string
  instagram?: string
  city: string
  howFound: string
  message?: string
}

export type OrderRow = {
  date: string
  product: string
  size: string
  value: number
  status: 'pago' | 'pendente' | 'processando'
}

export type MonthStats = {
  key: string
  label: string
  labelFull: string
  prevLabel: string
  sales: number
  revenue: number
  commission: number
  deltaSales: number
  deltaRevenue: number
  weekBars: [number, number, number, number]
  items: OrderRow[]
}

const PT_MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const PT_MONTHS_FULL  = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function mapPaymentStatus(status: string): 'pago' | 'pendente' | 'processando' {
  if (status === 'paid') return 'pago'
  if (status === 'pending') return 'pendente'
  return 'processando'
}

export async function createAffiliateApplication(
  data: AffiliateFormData,
): Promise<{ success: boolean; error?: string }> {
  if (!data.name.trim() || !data.email.trim() || !data.phone.trim() || !data.city.trim()) {
    return { success: false, error: 'Preencha todos os campos obrigatórios.' }
  }

  const supabase = createServiceClient()

  const notes = JSON.stringify({
    instagram: data.instagram?.trim() || null,
    cidade: data.city.trim(),
    como_conheceu: data.howFound,
    mensagem: data.message?.trim() || null,
  })

  const { error } = await supabase.from('partners').insert({
    name: data.name.trim(),
    contact_name: data.name.trim(),
    type: 'affiliate',
    email: data.email.trim(),
    phone: data.phone.trim(),
    is_active: false,
    notes,
  })

  if (error) {
    console.error('[affiliate] insert error:', error)
    return { success: false, error: 'Erro ao salvar cadastro. Tente novamente.' }
  }

  return { success: true }
}

export async function invitePartnerUser(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  if (!email.trim()) return { ok: false, error: 'Email obrigatório.' }
  const supabase = createServiceClient()
  const { error } = await supabase.auth.admin.inviteUserByEmail(email.trim())
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getAffiliateProfile(): Promise<{
  id: string
  name: string
  commissionPct: number
  paymentDay: number | null
  couponCode: string | null
  couponId: string | null
} | null> {
  const userClient = createClient()
  const { data: { session } } = await userClient.auth.getSession()
  if (!session?.user?.email) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('partners')
    .select('id, name, contact_name, commission_pct, payment_day, coupon_id, coupons!coupon_id(code)')
    .eq('email', session.user.email)
    .eq('type', 'affiliate')
    .single()

  if (!data) return null

  type CouponEmbed = { code: string } | null
  const coupon = data.coupons as CouponEmbed

  return {
    id: data.id as string,
    name: (data.contact_name ?? data.name) as string,
    commissionPct: (data.commission_pct as number | null) ?? 10,
    paymentDay: data.payment_day as number | null,
    couponCode: coupon?.code ?? null,
    couponId: data.coupon_id as string | null,
  }
}

export async function getAffiliateOrderHistory(
  couponId: string,
  commissionPct: number,
): Promise<MonthStats[]> {
  const supabase = createServiceClient()

  const { data: rawOrders } = await supabase
    .from('orders')
    .select(`
      id,
      payment_status,
      created_at,
      order_items (
        quantity,
        unit_price,
        product_variants (
          size,
          products ( name )
        )
      )
    `)
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false })

  if (!rawOrders?.length) return []

  type RawItem = {
    quantity: number
    unit_price: number
    product_variants: { size: string | null; products: { name: string } | null } | null
  }
  type RawOrder = {
    id: string
    payment_status: string
    created_at: string
    order_items: RawItem[]
  }

  const monthMap = new Map<string, {
    label: string; labelFull: string; prevLabel: string
    sales: number; revenue: number
    weekBars: [number, number, number, number]
    items: OrderRow[]
  }>()

  for (const order of rawOrders as RawOrder[]) {
    const d = new Date(order.created_at)
    const m = d.getMonth()
    const y = d.getFullYear()
    const key = `${y}-${String(m + 1).padStart(2, '0')}`
    const prevM = m === 0 ? 11 : m - 1

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        label: PT_MONTHS_SHORT[m].charAt(0).toUpperCase() + PT_MONTHS_SHORT[m].slice(1),
        labelFull: `${PT_MONTHS_FULL[m]}/${String(y).slice(2)}`,
        prevLabel: PT_MONTHS_SHORT[prevM],
        sales: 0,
        revenue: 0,
        weekBars: [0, 0, 0, 0],
        items: [],
      })
    }

    const month = monthMap.get(key)!
    const weekIdx = Math.min(3, Math.floor((d.getDate() - 1) / 7)) as 0 | 1 | 2 | 3
    month.weekBars[weekIdx]++

    const dayStr = `${d.getDate()} ${PT_MONTHS_SHORT[m]}`
    const status = mapPaymentStatus(order.payment_status)

    for (const item of order.order_items as RawItem[]) {
      const value = Math.round(item.unit_price * item.quantity * 100) / 100
      month.sales++
      month.revenue += value
      month.items.push({
        date: dayStr,
        product: item.product_variants?.products?.name ?? 'Produto',
        size: item.product_variants?.size ?? '—',
        value,
        status,
      })
    }
  }

  const sorted = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, m]) => ({
      key, ...m,
      revenue: Math.round(m.revenue * 100) / 100,
      commission: Math.round(m.revenue * commissionPct / 100),
      deltaSales: 0,
      deltaRevenue: 0,
    }))

  for (let i = 0; i < sorted.length; i++) {
    const prev = sorted[i + 1]
    if (prev) {
      sorted[i].deltaSales = sorted[i].sales - prev.sales
      sorted[i].deltaRevenue = Math.round(sorted[i].revenue - prev.revenue)
    }
  }

  return sorted
}
