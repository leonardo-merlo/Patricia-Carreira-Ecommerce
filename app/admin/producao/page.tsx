import { getProductionOrders, getWholesaleVariants } from '@/lib/supabase/admin-queries'
import { ProducaoClient } from '@/components/admin/producao-client'

export const dynamic = 'force-dynamic'

export default async function ProducaoPage() {
  const [ops, variants] = await Promise.all([
    getProductionOrders(),
    getWholesaleVariants(),
  ])
  return <ProducaoClient ops={ops} variants={variants} />
}
