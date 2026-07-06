import { createServiceClient } from '@/lib/supabase/service'
import type { Coupon } from '@/lib/types'

export async function getAllCoupons(): Promise<Coupon[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllCoupons]', error)
    return []
  }

  return (data ?? []) as Coupon[]
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const supabase = createServiceClient()

  // Comparação exata case-insensitive — códigos são salvos em maiúsculas.
  // Nunca usar ilike aqui: o código vem do usuário e curingas (% e _)
  // permitiriam casar qualquer cupom ativo.
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getCouponByCode]', error)
    return null
  }

  if (!data) return null

  const coupon = data as Coupon
  const now = new Date()

  if (coupon.valid_from && new Date(coupon.valid_from) > now) return null
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return null
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) return null

  return coupon
}

// Desconto calculado no servidor a partir do cupom validado — nunca confiar
// em valores de desconto vindos do cliente.
export function computeCouponDiscount(coupon: Coupon, subtotal: number): number {
  const discount =
    coupon.type === 'percent'
      ? subtotal * (coupon.value / 100)
      : Math.min(coupon.value, subtotal)
  return Math.round(discount * 100) / 100
}

export async function recordCouponUsage(
  couponId: string,
  orderId: string,
  userId: string | null,
  email: string | null,
): Promise<void> {
  const supabase = createServiceClient()

  const { error: usageError } = await supabase.from('coupon_usages').insert({
    coupon_id: couponId,
    order_id: orderId,
    user_id: userId,
    email: email ?? null,
  })
  if (usageError) console.error('[recordCouponUsage] insert:', usageError)

  const { error: rpcError } = await supabase.rpc('increment_coupon_uses', {
    p_coupon_id: couponId,
  })
  if (rpcError) console.error('[recordCouponUsage] increment:', rpcError)
}
