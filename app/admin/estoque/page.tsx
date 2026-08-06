import {
  getAllProductsWithVariants,
  getRawMaterials,
  getCutCategories,
  getMaterialColors,
  getRecipeMaterialOptions,
} from '@/lib/supabase/admin-queries'
import { EstoqueClient } from '@/components/admin/estoque-client'

export default async function EstoquePage() {
  const [products, rawMaterials, cutCategories, materialColors, recipeMaterials] =
    await Promise.all([
      getAllProductsWithVariants(),
      getRawMaterials(),
      getCutCategories(),
      getMaterialColors(),
      getRecipeMaterialOptions(),
    ])

  return (
    <EstoqueClient
      products={products}
      rawMaterials={rawMaterials}
      cutCategories={cutCategories}
      materialColors={materialColors}
      recipeMaterials={recipeMaterials}
    />
  )
}
