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

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
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
