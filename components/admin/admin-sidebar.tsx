"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminIcon } from './admin-icon'

interface AdminSidebarProps {
  openOrders: number
  lowStock: number
}

const secondaryNav = [
  { href: '/admin/relatorios', label: 'Relatórios', icon: 'trendUp' as const },
  { href: '/admin/clientes', label: 'Clientes', icon: 'users' as const },
  { href: '/admin/fornecedores', label: 'Fornecedores', icon: 'truck' as const },
  { href: '/admin/config', label: 'Configurações', icon: 'settings' as const },
]

export function AdminSidebar({ openOrders, lowStock }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const primaryNav = [
    { href: '/admin', label: 'Dashboard', icon: 'home' as const, badge: null, badgeAlert: false },
    { href: '/admin/pedidos', label: 'Pedidos', icon: 'bag' as const, badge: openOrders > 0 ? String(openOrders) : null, badgeAlert: false },
    { href: '/admin/estoque', label: 'Estoque', icon: 'box' as const, badge: lowStock > 0 ? String(lowStock) : null, badgeAlert: lowStock > 0 },
    { href: '/admin/materias', label: 'Matérias-Primas', icon: 'layers' as const, badge: null, badgeAlert: false },
    { href: '/admin/producao', label: 'Produção', icon: 'wrench' as const, badge: null, badgeAlert: false },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">PC</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Patrícia Carreira</span>
          <span className="sidebar-brand-sub">Painel administrativo</span>
        </div>
      </div>

      <div className="sidebar-section-label">Operação</div>
      <nav className="sidebar-nav">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
            id={`sidebar-nav-${item.href.replace('/admin/', '').replace('/admin', 'dashboard')}`}
          >
            <AdminIcon name={item.icon} />
            <span>{item.label}</span>
            {item.badge && (
              <span className={`nav-badge ${item.badgeAlert ? 'alert' : ''}`}>
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-section-label">Geral</div>
      <nav className="sidebar-nav">
        {secondaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
            id={`sidebar-nav-${item.href.replace('/admin/', '')}`}
          >
            <AdminIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">HC</div>
        <div className="sidebar-user">
          <span className="name">Henrique Carreira</span>
          <span className="role">Proprietário</span>
        </div>
        <button className="ico-btn" title="Sair" id="btn-logout">
          <AdminIcon name="logout" size={14} />
        </button>
      </div>
    </aside>
  )
}
