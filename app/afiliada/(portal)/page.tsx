import { getAffiliateProfile, getAffiliateOrderHistory } from '@/lib/actions/partners'
import { getAffiliatePromoProducts } from '@/lib/supabase/products'
import { AfiliadaContent } from './afiliada-content'

export default async function AfiliadaPage() {
  const profile = await getAffiliateProfile()
  const orderHistory = await getAffiliateOrderHistory()
  const promoProducts = await getAffiliatePromoProducts()

  return (
    <AfiliadaContent
      name={profile?.name ?? 'Afiliada'}
      commissionPct={profile?.commissionPct ?? 10}
      paymentDay={profile?.paymentDay ?? null}
      couponCode={profile?.couponCode ?? null}
      orderHistory={orderHistory}
      promoProducts={promoProducts}
    />
  )
}
