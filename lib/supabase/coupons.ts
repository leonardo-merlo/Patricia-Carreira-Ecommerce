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

  console.log('[getCouponByCode] buscando código:', code)

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .eq('is_active', true)
    .maybeSingle()

  console.log('[getCouponByCode] resultado:', { data, error })

  if (error) {
    console.error('[getCouponByCode] erro:', error)
    return null
  }

  if (!data) {
    console.log('[getCouponByCode] nenhum cupom encontrado com esse código e is_active=true')
    return null
  }

  const coupon = data as Coupon
  const now = new Date()

  console.log('[getCouponByCode] cupom encontrado:', {
    code: coupon.code,
    is_active: coupon.is_active,
    valid_from: coupon.valid_from,
    valid_until: coupon.valid_until,
    max_uses: coupon.max_uses,
    uses_count: coupon.uses_count,
    now: now.toISOString(),
  })

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    console.log('[getCouponByCode] bloqueado: valid_from ainda não chegou')
    return null
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    console.log('[getCouponByCode] bloqueado: valid_until expirou')
    return null
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    console.log('[getCouponByCode] bloqueado: limite de usos atingido')
    return null
  }

  console.log('[getCouponByCode] cupom válido, retornando')
  return coupon
}
