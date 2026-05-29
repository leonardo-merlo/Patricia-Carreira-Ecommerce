import { getRetailOrders } from '@/lib/supabase/admin-queries'
import { PedidosClient } from '@/components/admin/pedidos-client'

export default async function PedidosPage() {
  const varejo = await getRetailOrders(50)
  return <PedidosClient varejo={varejo} />
}
