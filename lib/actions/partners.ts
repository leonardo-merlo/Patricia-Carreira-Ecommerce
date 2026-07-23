'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/server/auth'
import { revalidatePath } from 'next/cache'

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
  await requireAdmin()
  if (!email.trim()) return { ok: false, error: 'Email obrigatório.' }
  const supabase = createServiceClient()
  const { error } = await supabase.auth.admin.inviteUserByEmail(email.trim())
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── CRUD de afiliadas (painel admin) ──────────────────────────────────────────

export type AffiliateFormInput = {
  name: string
  email: string
  phone: string
  couponCode: string
  commissionPct: number
}

async function findOrCreateCoupon(code: string, commissionPct: number): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceClient()
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { error: 'Cupom obrigatório.' }

  const { data: existing } = await supabase.from('coupons').select('id').eq('code', normalized).maybeSingle()
  if (existing) return { id: existing.id as string }

  const { data: created, error } = await supabase
    .from('coupons')
    .insert({ code: normalized, type: 'percent', value: commissionPct, is_active: true, description: `Cupom de afiliada — ${normalized}` })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: created.id as string }
}

export async function createAffiliatePartner(
  data: AffiliateFormInput,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  await requireAdmin()
  if (!data.name.trim() || !data.email.trim()) return { success: false, error: 'Nome e e-mail são obrigatórios.' }

  const coupon = await findOrCreateCoupon(data.couponCode, data.commissionPct)
  if ('error' in coupon) return { success: false, error: coupon.error }

  const supabase = createServiceClient()
  const { data: created, error } = await supabase
    .from('partners')
    .insert({
      name: data.name.trim(),
      contact_name: data.name.trim(),
      type: 'affiliate',
      email: data.email.trim(),
      phone: data.phone.trim() || null,
      commission_pct: data.commissionPct,
      coupon_id: coupon.id,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/afiliados')
  return { success: true, id: created.id as string }
}

export async function updateAffiliatePartner(
  partnerId: string,
  data: AffiliateFormInput,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin()
  if (!data.name.trim() || !data.email.trim()) return { success: false, error: 'Nome e e-mail são obrigatórios.' }

  const coupon = await findOrCreateCoupon(data.couponCode, data.commissionPct)
  if ('error' in coupon) return { success: false, error: coupon.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('partners')
    .update({
      name: data.name.trim(),
      contact_name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim() || null,
      commission_pct: data.commissionPct,
      coupon_id: coupon.id,
    })
    .eq('id', partnerId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/afiliados')
  return { success: true }
}

// Dia de vencimento da comissão de um mês de referência: payment_day (ou 10)
// do mês seguinte — mesma regra usada no portal da afiliada (getPayDate).
function commissionDueDate(referenceMonth: string, paymentDay: number | null): string {
  const [y, m] = referenceMonth.split('-').map(Number)
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  const day = paymentDay ?? 10
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Garante que toda comissão de afiliada com venda no mês vire uma "conta a
// pagar" de verdade (categoria "Comissão de Afiliadas"), pra aparecer no
// Financeiro e entrar no cálculo de resultado do mês. Idempotente — só cria
// o que ainda não existe, nunca sobrescreve valor/status já lançado.
export async function syncAffiliateCommissionPayables(): Promise<void> {
  const supabase = createServiceClient()

  const { data: partners } = await supabase
    .from('partners')
    .select('id, name, contact_name, commission_pct, payment_day, coupon_id')
    .eq('type', 'affiliate')
    .not('coupon_id', 'is', null)

  type PartnerRow = {
    id: string; name: string; contact_name: string | null
    commission_pct: number | null; payment_day: number | null; coupon_id: string
  }
  const rows = (partners ?? []) as PartnerRow[]
  if (rows.length === 0) return

  const couponIds = rows.map((p) => p.coupon_id)
  const { data: orders } = await supabase
    .from('orders')
    .select('coupon_id, created_at, order_items(quantity, unit_price)')
    .in('coupon_id', couponIds)

  type RawOrder = { coupon_id: string; created_at: string; order_items: { quantity: number; unit_price: number }[] }

  const revenueByCouponMonth = new Map<string, Map<string, number>>()
  for (const o of (orders ?? []) as RawOrder[]) {
    const d = new Date(o.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!revenueByCouponMonth.has(o.coupon_id)) revenueByCouponMonth.set(o.coupon_id, new Map())
    const monthMap = revenueByCouponMonth.get(o.coupon_id)!
    const revenue = o.order_items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0)
    monthMap.set(key, (monthMap.get(key) ?? 0) + revenue)
  }

  const toInsert: Record<string, unknown>[] = []
  for (const p of rows) {
    const monthMap = revenueByCouponMonth.get(p.coupon_id)
    if (!monthMap) continue
    const commissionPct = Number(p.commission_pct) || 10
    const name = p.contact_name ?? p.name
    for (const [key, revenue] of Array.from(monthMap.entries())) {
      const commission = Math.round(revenue * commissionPct) / 100
      if (commission <= 0) continue
      const [y, m] = key.split('-')
      toInsert.push({
        description: `Comissão de afiliada — ${name} — ${PT_MONTHS_SHORT[Number(m) - 1]}/${y}`,
        amount: commission,
        due_date: commissionDueDate(key, p.payment_day),
        category: 'Comissão de Afiliadas',
        creditor: name,
        is_recurring: false,
        partner_id: p.id,
        reference_month: key,
      })
    }
  }

  if (toInsert.length === 0) return

  await supabase
    .from('accounts_payable')
    .upsert(toInsert, { onConflict: 'partner_id,reference_month', ignoreDuplicates: true })
}

export async function setAffiliatePaymentStatus(
  partnerId: string,
  month: string,
  paid: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin()
  await syncAffiliateCommissionPayables()

  const supabase = createServiceClient()
  const { data: existing, error: fetchError } = await supabase
    .from('accounts_payable')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('reference_month', month)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError.message }

  if (!existing) {
    // Sem venda registrada nesse mês ainda — nada a marcar.
    return { success: true }
  }

  const { error } = await supabase
    .from('accounts_payable')
    .update({
      paid_at: paid ? new Date().toISOString().slice(0, 10) : null,
      payment_method: paid ? 'pix' : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/afiliados')
  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function getAffiliateProfile(): Promise<{
  id: string
  name: string
  commissionPct: number
  paymentDay: number | null
  couponCode: string | null
  couponId: string | null
} | null> {
  // getUser valida o JWT no servidor Supabase — getSession confia no cookie sem verificar
  const userClient = createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user?.email) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('partners')
    .select('id, name, contact_name, commission_pct, payment_day, coupon_id, coupons!coupon_id(code)')
    .eq('email', user.email)
    .eq('type', 'affiliate')
    .single()

  if (!data) return null

  // O PostgREST pode retornar o embed como objeto ou array de 1 item
  type CouponEmbed = { code: string } | null
  const couponRaw = data.coupons as unknown
  const coupon = (Array.isArray(couponRaw) ? couponRaw[0] ?? null : couponRaw) as CouponEmbed

  return {
    id: data.id as string,
    name: (data.contact_name ?? data.name) as string,
    commissionPct: (data.commission_pct as number | null) ?? 10,
    paymentDay: data.payment_day as number | null,
    couponCode: coupon?.code ?? null,
    couponId: data.coupon_id as string | null,
  }
}

// O cupom e a comissão vêm sempre do perfil da afiliada logada — nunca de
// parâmetros do cliente, senão qualquer sessão veria vendas de outros cupons.
export async function getAffiliateOrderHistory(): Promise<MonthStats[]> {
  const profile = await getAffiliateProfile()
  if (!profile?.couponId) return []
  const couponId = profile.couponId
  const commissionPct = profile.commissionPct

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

  for (const order of rawOrders as unknown as RawOrder[]) {
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
