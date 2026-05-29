import { getAllProductsWithVariants } from '@/lib/supabase/admin-queries'
import { EstoqueClient } from '@/components/admin/estoque-client'

export default async function EstoquePage() {
  const products = await getAllProductsWithVariants()
  return <EstoqueClient products={products} />
}
