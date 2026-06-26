import { getAffiliateProfile } from '@/lib/actions/partners'
import { AfiliadaContent } from './afiliada-content'

export default async function AfiliadaPage() {
  const profile = await getAffiliateProfile()

  return (
    <AfiliadaContent
      name={profile?.name ?? 'Afiliada'}
      commissionPct={profile?.commissionPct ?? 10}
      paymentDay={profile?.paymentDay ?? null}
    />
  )
}
