"use client" // popover com estado de aberto, aba de lidas e marcação de lido

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from './admin-icon'
import { SidebarPopover } from './sidebar-popover'
import {
  markRead,
  markUnread,
  markAllRead,
  listReadNotifications,
  type AdminNotification,
  type NotificationKind,
} from '@/lib/actions/notifications'

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

function groupBy(list: AdminNotification[]) {
  return GROUP_ORDER
    .map((kind) => ({ kind, items: list.filter((n) => n.kind === kind) }))
    .filter((g) => g.items.length > 0)
}

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
  const [tab, setTab] = useState<'unread' | 'read'>('unread')
  const [isPending, startTransition] = useTransition()

  // O servidor só manda as não lidas. As lidas são buscadas sob demanda, ao
  // abrir a aba: é uma tela de desfazer, não vale carregar em toda navegação.
  const [readItems, setReadItems] = useState<AdminNotification[] | null>(null)
  const [loadingRead, setLoadingRead] = useState(false)

  // Sai da lista na hora do clique. O revalidate do servidor vem depois e
  // confirma; sem isso o item fica visível esperando o round-trip.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const key = (n: AdminNotification) => `${n.kind}:${n.refId}`

  const unread = notifications.filter((n) => !dismissed.has(key(n)))
  const count = unread.length

  async function refreshRead() {
    setLoadingRead(true)
    try {
      setReadItems(await listReadNotifications())
    } finally {
      setLoadingRead(false)
    }
  }

  function switchTab(next: 'unread' | 'read') {
    setTab(next)
    if (next === 'read') void refreshRead()
  }

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

  function dismiss(n: AdminNotification) {
    setDismissed((prev) => new Set(prev).add(key(n)))
    startTransition(async () => {
      await markRead(n.kind, n.refId)
      router.refresh()
    })
  }

  function restore(n: AdminNotification) {
    setReadItems((prev) => (prev ?? []).filter((r) => key(r) !== key(n)))
    setDismissed((prev) => {
      const next = new Set(prev)
      next.delete(key(n))
      return next
    })
    startTransition(async () => {
      await markUnread(n.kind, n.refId)
      router.refresh()
    })
  }

  const list = tab === 'unread' ? unread : (readItems ?? [])
  const groups = groupBy(list)

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

      {/* Canto, não ancorado ao botão: a lista é longa e tem abas, e no canto
          ela usa a altura inteira em vez de ficar pendurada no meio da tela. */}
      <SidebarPopover open={open} onClose={() => setOpen(false)} labelledBy="sidebar-nav-notificacoes" anchor="corner">
        <div className="row between" style={{ padding: '8px 10px 6px', gap: 8 }}>
          <span className="sidebar-popover-title" style={{ padding: 0 }}>
            Notificações{count > 0 ? ` · ${count}` : ''}
          </span>
          {tab === 'unread' && count > 0 && (
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

        <div className="popover-tabs" role="tablist" aria-label="Filtro de notificações">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'unread'}
            className={`popover-tab ${tab === 'unread' ? 'active' : ''}`}
            data-testid="tab-notificacoes-nao-lidas"
            onClick={() => switchTab('unread')}
          >
            Não lidas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'read'}
            className={`popover-tab ${tab === 'read' ? 'active' : ''}`}
            data-testid="tab-notificacoes-lidas"
            onClick={() => switchTab('read')}
          >
            Lidas
          </button>
        </div>

        {tab === 'read' && loadingRead && readItems === null ? (
          <div className="cust-meta" style={{ padding: '10px' }}>Carregando…</div>
        ) : list.length === 0 ? (
          <div className="cust-meta" style={{ padding: '10px', lineHeight: 1.6 }}>
            {tab === 'unread'
              ? 'Nada por aqui. Contas a vencer, pedidos novos e estoque baixo aparecem neste espaço.'
              : 'Nenhuma marcada como lida hoje. As de conta a vencer e estoque baixo voltam sozinhas amanhã.'}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.kind}>
              <div className="sidebar-popover-title">{KIND_GROUP[group.kind]}</div>
              {group.items.map((n) => (
                <div key={key(n)} className="sidebar-popover-row">
                  <button
                    type="button"
                    className="sidebar-popover-item"
                    data-testid="item-notificacao"
                    onClick={() => openNotification(n)}
                  >
                    <AdminIcon name={KIND_ICON[n.kind]} size={14} />
                    <span>
                      <span className="sidebar-popover-label">
                        {n.urgent && tab === 'unread' && <span className="notif-dot" aria-hidden="true" />}
                        {n.title}
                      </span>
                      <span className="sidebar-popover-desc">{n.detail}</span>
                    </span>
                  </button>

                  {tab === 'unread' ? (
                    <button
                      type="button"
                      className="popover-row-action"
                      title="Marcar como lida"
                      aria-label={`Marcar como lida: ${n.title}`}
                      data-testid="btn-marcar-lida"
                      disabled={isPending}
                      onClick={() => dismiss(n)}
                    >
                      <AdminIcon name="x" size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="popover-row-action"
                      title="Marcar como não lida"
                      aria-label={`Marcar como não lida: ${n.title}`}
                      data-testid="btn-marcar-nao-lida"
                      disabled={isPending}
                      onClick={() => restore(n)}
                    >
                      <AdminIcon name="history" size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </SidebarPopover>
    </>
  )
}
