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

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .eq('is_active', true)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .lte('valid_from', now)
    .maybeSingle()

  if (error) {
    console.error('[getCouponByCode]', error)
    return null
  }

  if (!data) return null

  const coupon = data as Coupon

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) return null

  return coupon
}
