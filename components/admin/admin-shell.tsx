"use client" // estado da sidebar: colapso no desktop, gaveta no mobile

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './admin-sidebar'
import { AdminIcon } from './admin-icon'
import { signOut } from '@/lib/actions/auth'
import type { AdminNotification } from '@/lib/actions/notifications'

const COLLAPSED_KEY = 'pc-admin-sidebar-collapsed'

interface AdminShellProps {
  openOrders: number
  lowStock: number
  notifications: AdminNotification[]
  fontClassName: string
  children: React.ReactNode
}

export function AdminShell({ openOrders, lowStock, notifications, fontClassName, children }: AdminShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

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
        notifications={notifications}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onNavigate={() => setMobileOpen(false)}
        onLogoutClick={() => { setMobileOpen(false); setConfirmLogout(true) }}
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

      {/* Fora do <aside> de propósito: aqui o backdrop cobre a tela inteira em
          qualquer largura, e nada atrás dele recebe clique. */}
      {confirmLogout && (
        <div className="modal-backdrop" onClick={() => setConfirmLogout(false)}>
          <div
            className="modal confirm-modal"
            id="confirm-sair-admin"
            data-testid="confirm-sair-admin"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-modal-icon"><AdminIcon name="logout" size={22} /></div>
            <h3 className="confirm-modal-title">Sair do painel?</h3>
            <p className="confirm-modal-text">Você precisará entrar de novo para voltar.</p>
            <div className="confirm-modal-actions">
              <button className="btn ghost" onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <form action={signOut}>
                <button type="submit" className="btn danger-outline" id="btn-confirmar-saida-admin">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
