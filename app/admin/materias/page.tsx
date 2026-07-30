import { getRawMaterials, getAllProductsWithBOM, getPurchaseRequests } from '@/lib/supabase/admin-queries'
import { getSuppliers } from '@/lib/actions/suppliers'
import { MateriasClient } from '@/components/admin/materias-client'

export const dynamic = 'force-dynamic'

export default async function MateriasPage() {
  const [materials, products, purchaseRequests, suppliers] = await Promise.all([
    getRawMaterials(),
    getAllProductsWithBOM(),
    getPurchaseRequests(),
    getSuppliers(),
  ])

  return (
    <MateriasClient
      materials={materials}
      products={products}
      purchaseRequests={purchaseRequests}
      suppliers={suppliers}
    />
  )
}
