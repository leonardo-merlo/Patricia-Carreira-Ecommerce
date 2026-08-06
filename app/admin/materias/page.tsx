import {
  getRawMaterials,
  getAllProductsWithBOM,
  getPurchaseRequests,
  getPendingCutMaterials,
  getCutCategories,
  getMaterialColors,
} from '@/lib/supabase/admin-queries'
import { getSuppliers } from '@/lib/actions/suppliers'
import { MateriasClient } from '@/components/admin/materias-client'

export const dynamic = 'force-dynamic'

export default async function MateriasPage() {
  const [materials, products, purchaseRequests, suppliers, pendingCuts, cutCategories, materialColors] =
    await Promise.all([
      getRawMaterials(),
      getAllProductsWithBOM(),
      getPurchaseRequests(),
      getSuppliers(),
      getPendingCutMaterials(),
      getCutCategories(),
      getMaterialColors(),
    ])

  return (
    <MateriasClient
      materials={materials}
      products={products}
      pendingCuts={pendingCuts}
      purchaseRequests={purchaseRequests}
      suppliers={suppliers}
      cutCategories={cutCategories}
      materialColors={materialColors}
    />
  )
}
