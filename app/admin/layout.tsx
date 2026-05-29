import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { getSidebarCounts } from '@/lib/supabase/admin-queries'
import './admin.css'

export const metadata = {
  title: 'Painel Admin — Patrícia Carreira',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const counts = await getSidebarCounts()

  return (
    <div className="admin-root">
      <AdminSidebar openOrders={counts.open_orders} lowStock={counts.low_stock} />
      <div className="main">
        {children}
      </div>
    </div>
  )
}
