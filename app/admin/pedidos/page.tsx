import {
  getRetailOrders,
  getWholesaleOrders,
  getWholesaleCustomers,
  getWholesaleVariants,
} from '@/lib/supabase/admin-queries'
import { PedidosClient } from '@/components/admin/pedidos-client'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const [varejo, atacado, customers, variants] = await Promise.all([
    getRetailOrders(50),
    getWholesaleOrders(50),
    getWholesaleCustomers(),
    getWholesaleVariants(),
  ])

  return (
    <PedidosClient
      varejo={varejo}
      atacado={atacado}
      wholesaleCustomers={customers}
      wholesaleVariants={variants}
    />
  )
}
