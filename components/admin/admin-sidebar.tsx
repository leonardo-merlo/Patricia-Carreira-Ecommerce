"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AdminIcon } from './admin-icon'

interface AdminSidebarProps {
  openOrders: number
  lowStock: number
  mobileOpen: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onNavigate: () => void
}

const secondaryNav = [
  { href: '/admin/financeiro', label: 'Financeiro', icon: 'wallet' as const },
  { href: '/admin/relatorios', label: 'Relatórios', icon: 'trendUp' as const },
  { href: '/admin/afiliados', label: 'Afiliadas', icon: 'tag' as const },
  { href: '/admin/cupons', label: 'Cupons', icon: 'creditCard' as const },
  { href: '/admin/clientes', label: 'Clientes', icon: 'users' as const },
  { href: '/admin/fornecedores', label: 'Fornecedores', icon: 'truck' as const },
]

export function AdminSidebar({
  openOrders,
  lowStock,
  mobileOpen,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const primaryNav = [
    { href: '/admin', label: 'Dashboard', icon: 'home' as const, badge: null, badgeAlert: false },
    { href: '/admin/estoque', label: 'Estoque', icon: 'box' as const, badge: lowStock > 0 ? String(lowStock) : null, badgeAlert: lowStock > 0 },
    { href: '/admin/pedidos', label: 'Pedidos', icon: 'bag' as const, badge: openOrders > 0 ? String(openOrders) : null, badgeAlert: false },
    { href: '/admin/materias', label: 'Matérias-Primas', icon: 'layers' as const, badge: null, badgeAlert: false },
    { href: '/admin/producao', label: 'Produção', icon: 'wrench' as const, badge: null, badgeAlert: false },
  ]

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} id="admin-sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">
          <Image
            src="/images/logo/logo-v2.png"
            alt=""
            width={32}
            height={32}
            aria-hidden="true"
          />
        </span>
        <span className="sidebar-brand-text">
          <span className="sidebar-brand-name">Patrícia Carreira</span>
          <span className="sidebar-brand-sub">Painel administrativo</span>
        </span>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          aria-controls="admin-sidebar"
          id="btn-sidebar-collapse"
          data-testid="btn-sidebar-collapse"
        >
          <AdminIcon name={collapsed ? 'chevRight' : 'chevLeft'} size={14} />
        </button>
      </div>

      <div className="sidebar-section-label">Operação</div>
      <nav className="sidebar-nav">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
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
            onClick={onNavigate}
            className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
            id={`sidebar-nav-${item.href.replace('/admin/', '')}`}
          >
            <AdminIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link
          href="/admin/diagnostico"
          onClick={onNavigate}
          className={`sidebar-item ${isActive('/admin/diagnostico') ? 'active' : ''}`}
          title={collapsed ? 'Diagnóstico' : undefined}
          id="sidebar-nav-diagnostico"
        >
          <AdminIcon name="plug" />
          <span>Diagnóstico</span>
        </Link>

        <Link
          href="/admin/config"
          onClick={onNavigate}
          className={`sidebar-item ${isActive('/admin/config') ? 'active' : ''}`}
          title={collapsed ? 'Configurações' : undefined}
          id="sidebar-nav-config"
        >
          <AdminIcon name="settings" />
          <span>Configurações</span>
        </Link>

        <div className="sidebar-user-row">
          <div className="sidebar-avatar">HC</div>
          <div className="sidebar-user">
            <span className="name">Henrique Carreira</span>
            <span className="role">Proprietário</span>
          </div>
          <button className="ico-btn" title="Sair" aria-label="Sair" id="btn-logout">
            <AdminIcon name="logout" size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
