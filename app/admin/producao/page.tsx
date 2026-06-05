import { getProductionOrders, getWholesaleVariants, getRawMaterials } from '@/lib/supabase/admin-queries'
import { ProducaoClient } from '@/components/admin/producao-client'

export const dynamic = 'force-dynamic'

export default async function ProducaoPage() {
  const [ops, variants, materials] = await Promise.all([
    getProductionOrders(),
    getWholesaleVariants(),
    getRawMaterials(),
  ])
  return <ProducaoClient ops={ops} variants={variants} materials={materials} />
}
