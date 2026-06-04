import { getAllCoupons } from '@/lib/supabase/coupons'
import { CuponsClient } from './cupons-client'

export default async function CuponsPage() {
  const coupons = await getAllCoupons()
  return <CuponsClient initialCoupons={coupons} />
}
