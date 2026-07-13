import { getAllProductsWithVariants, getRawMaterials } from '@/lib/supabase/admin-queries'
import { EstoqueClient } from '@/components/admin/estoque-client'

export default async function EstoquePage() {
  const [products, rawMaterials] = await Promise.all([
    getAllProductsWithVariants(),
    getRawMaterials(),
  ])
  return <EstoqueClient products={products} rawMaterials={rawMaterials} />
}
