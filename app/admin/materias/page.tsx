import { getRawMaterials, getAllProductsWithBOM, getPurchaseRequests, getPendingCutMaterials } from '@/lib/supabase/admin-queries'
import { getSuppliers } from '@/lib/actions/suppliers'
import { MateriasClient } from '@/components/admin/materias-client'

export const dynamic = 'force-dynamic'

export default async function MateriasPage() {
  const [materials, products, purchaseRequests, suppliers, pendingCuts] = await Promise.all([
    getRawMaterials(),
    getAllProductsWithBOM(),
    getPurchaseRequests(),
    getSuppliers(),
    getPendingCutMaterials(),
  ])

  return (
    <MateriasClient
      materials={materials}
      products={products}
      pendingCuts={pendingCuts}
      purchaseRequests={purchaseRequests}
      suppliers={suppliers}
    />
  )
}
