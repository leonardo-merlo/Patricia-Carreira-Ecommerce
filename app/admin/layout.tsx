import { Inter } from 'next/font/google'
import { AdminShell } from '@/components/admin/admin-shell'
import { getSidebarCounts } from '@/lib/supabase/admin-queries'
import './admin.css'

// Inter era carregada por @import de CDN dentro do CSS — bloqueava o render
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Painel Admin — Patrícia Carreira',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const counts = await getSidebarCounts()

  return (
    <AdminShell
      openOrders={counts.open_orders}
      lowStock={counts.low_stock}
      fontClassName={inter.variable}
    >
      {children}
    </AdminShell>
  )
}
