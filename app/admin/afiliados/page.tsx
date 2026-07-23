import { getAllAffiliatesWithStats } from '@/lib/supabase/admin-queries'
import { AfiliadosClient } from '@/components/admin/afiliados-client'

export const dynamic = 'force-dynamic'

export default async function AfiliadadosPage() {
  const affiliates = await getAllAffiliatesWithStats()
  return <AfiliadosClient initialData={affiliates} />
}
