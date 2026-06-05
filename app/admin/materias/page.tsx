import { getRawMaterials, getAllVariantsWithBOM, getPurchaseRequests } from '@/lib/supabase/admin-queries'
import { MateriasClient } from '@/components/admin/materias-client'

export const dynamic = 'force-dynamic'

export default async function MateriasPage() {
  const [materials, variants, purchaseRequests] = await Promise.all([
    getRawMaterials(),
    getAllVariantsWithBOM(),
    getPurchaseRequests(),
  ])

  return <MateriasClient materials={materials} variants={variants} purchaseRequests={purchaseRequests} />
}
