"use client" // estado da sidebar: colapso no desktop, gaveta no mobile

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './admin-sidebar'
import { AdminIcon } from './admin-icon'

const COLLAPSED_KEY = 'pc-admin-sidebar-collapsed'

interface AdminShellProps {
  openOrders: number
  lowStock: number
  fontClassName: string
  children: React.ReactNode
}

export function AdminShell({ openOrders, lowStock, fontClassName, children }: AdminShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1')
  }, [])

  // Trocar de página fecha a gaveta — senão ela fica aberta sobre o conteúdo novo
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className={`admin-root ${fontClassName} ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar
        openOrders={openOrders}
        lowStock={lowStock}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onNavigate={() => setMobileOpen(false)}
      />

      <div
        className={`sidebar-scrim ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <header className="admin-mobile-bar">
        <button
          className="admin-mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
          aria-controls="admin-sidebar"
          id="btn-admin-menu-mobile"
          data-testid="btn-admin-menu-mobile"
        >
          <AdminIcon name="menu" size={18} />
        </button>
        <span className="sidebar-logo">
          <Image src="/images/logo/logo-v2.png" alt="" width={28} height={28} aria-hidden="true" />
        </span>
        <span className="admin-mobile-title">Patrícia Carreira</span>
      </header>

      <div className="main">{children}</div>
    </div>
  )
}
