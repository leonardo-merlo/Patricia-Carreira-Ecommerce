import { getAllAffiliatesWithStats } from '@/lib/supabase/admin-queries'
import { syncAffiliateCommissionPayables } from '@/lib/actions/partners'
import { AfiliadosClient } from '@/components/admin/afiliados-client'

export const dynamic = 'force-dynamic'

export default async function AfiliadadosPage() {
  await syncAffiliateCommissionPayables()
  const affiliates = await getAllAffiliatesWithStats()
  return <AfiliadosClient initialData={affiliates} />
}
