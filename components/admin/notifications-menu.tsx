"use client" // popover com estado de aberto e marcação de lido

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from './admin-icon'
import { SidebarPopover } from './sidebar-popover'
import { markRead, markAllRead, type AdminNotification, type NotificationKind } from '@/lib/actions/notifications'

const KIND_ICON: Record<NotificationKind, 'wallet' | 'bag' | 'box' | 'layers'> = {
  account_due: 'wallet',
  new_order: 'bag',
  low_stock: 'box',
  low_material: 'layers',
}

const KIND_GROUP: Record<NotificationKind, string> = {
  account_due: 'Contas a pagar',
  new_order: 'Pedidos novos',
  low_stock: 'Estoque',
  low_material: 'Matérias-primas',
}

const GROUP_ORDER: NotificationKind[] = ['account_due', 'new_order', 'low_stock', 'low_material']

export function NotificationsMenu({
  notifications,
  collapsed,
  onNavigate,
}: {
  notifications: AdminNotification[]
  collapsed: boolean
  onNavigate: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const count = notifications.length

  function openNotification(n: AdminNotification) {
    setOpen(false)
    onNavigate()
    // Marca lida e navega. A navegação não espera a gravação: o Henrique quer
    // ver a tela, não o spinner de um update que ninguém olha.
    startTransition(async () => {
      await markRead(n.kind, n.refId)
    })
    router.push(n.href)
  }

  const groups = GROUP_ORDER
    .map((kind) => ({ kind, items: notifications.filter((n) => n.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <button
        type="button"
        className="sidebar-item"
        title={collapsed ? 'Notificações' : undefined}
        id="sidebar-nav-notificacoes"
        data-testid="sidebar-nav-notificacoes"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count > 0 ? `Notificações, ${count} não lidas` : 'Notificações'}
        onClick={() => setOpen((v) => !v)}
      >
        <AdminIcon name="bell" />
        <span>Notificações</span>
        {count > 0 && <span className="nav-badge alert">{count > 99 ? '99+' : count}</span>}
      </button>

      <SidebarPopover open={open} onClose={() => setOpen(false)} labelledBy="sidebar-nav-notificacoes">
        <div className="row between" style={{ padding: '8px 10px 6px', gap: 8 }}>
          <span className="sidebar-popover-title" style={{ padding: 0 }}>
            Notificações{count > 0 ? ` · ${count}` : ''}
          </span>
          {count > 0 && (
            <button
              className="linkish"
              style={{ fontSize: 11.5 }}
              disabled={isPending}
              data-testid="btn-marcar-todas-lidas"
              onClick={() => {
                startTransition(async () => {
                  await markAllRead()
                  setOpen(false)
                  router.refresh()
                })
              }}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {count === 0 ? (
          <div className="cust-meta" style={{ padding: '10px', lineHeight: 1.6 }}>
            Nada por aqui. Contas a vencer, pedidos novos e estoque baixo aparecem
            neste espaço.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.kind}>
              <div className="sidebar-popover-title">{KIND_GROUP[group.kind]}</div>
              {group.items.map((n) => (
                <button
                  key={`${n.kind}:${n.refId}`}
                  type="button"
                  className="sidebar-popover-item"
                  data-testid="item-notificacao"
                  onClick={() => openNotification(n)}
                >
                  <AdminIcon name={KIND_ICON[n.kind]} size={14} />
                  <span>
                    <span className="sidebar-popover-label">
                      {n.urgent && <span className="notif-dot" aria-hidden="true" />}
                      {n.title}
                    </span>
                    <span className="sidebar-popover-desc">{n.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </SidebarPopover>
    </>
  )
}
