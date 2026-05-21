import { AdminSidebar } from '@/components/admin/admin-sidebar'
import './admin.css'

export const metadata = {
  title: 'Painel Admin — Patrícia Carreira',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <div className="main">
        {children}
      </div>
    </div>
  )
}
