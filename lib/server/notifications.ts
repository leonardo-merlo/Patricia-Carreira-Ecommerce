import { createServiceClient } from '@/lib/supabase/service'
import { getStoreSettings } from './store-settings'

// Notificações do painel.
//
// O fato nunca é gravado: cada aviso é derivado dos dados na hora. O banco só
// guarda o que já foi lido (notification_reads). Isso evita a segunda verdade
// clássica — uma tabela de avisos que continua dizendo "conta a vencer" depois
// de a conta ter sido paga.
//
// A chave de leitura decide o comportamento:
//   • evento pontual (pedido novo) → ref_id é o id. Leu, some para sempre.
//   • condição que persiste (conta a vencer, estoque baixo) → ref_id é
//     "id:data". Leu hoje, volta amanhã enquanto a condição valer. É isso que
//     faz a conta avisar todo dia até um dia depois do vencimento.

export type NotificationKind = 'account_due' | 'new_order' | 'low_stock' | 'low_material'

export type AdminNotification = {
  kind: NotificationKind
  refId: string
  title: string
  detail: string
  href: string
  /** ISO usado só para ordenar. */
  at: string
  urgent: boolean
}

const LOW_STOCK_THRESHOLD = 3
const NEW_ORDER_WINDOW_DAYS = 30

/**
 * "Hoje" no fuso da loja. O servidor roda em UTC: perto da meia-noite, usar a
 * data do servidor viraria o dia três horas antes e a conta de amanhã apareceria
 * como a de hoje.
 */
function todayInStoreTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(new Date())
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

/**
 * Acima deste número, a condição vira um aviso só. Cinquenta e quatro linhas de
 * "estoque baixo" não são cinquenta e quatro notificações: são uma, com um
 * número dentro. O detalhe continua a um clique, na tela de estoque.
 */
const SUMMARIZE_ABOVE = 5

function summarizeOrList<T>({
  kind, today, href, items,
  groupTitle, groupDetail, itemTitle, itemDetail, itemSample, itemId, itemUrgent,
}: {
  kind: NotificationKind
  today: string
  href: string
  items: T[]
  groupTitle: (count: number) => string
  groupDetail: (sample: string[]) => string
  itemTitle: (item: T) => string
  itemDetail: (item: T) => string
  itemSample: (item: T) => string
  itemId: (item: T) => string
  itemUrgent: (item: T) => boolean
}): AdminNotification[] {
  if (items.length === 0) return []

  if (items.length > SUMMARIZE_ABOVE) {
    return [{
      kind,
      // A chave é a do dia, não a de cada item: o resumo é do dia inteiro.
      refId: `resumo:${today}`,
      title: groupTitle(items.length),
      detail: groupDetail(items.slice(0, 3).map(itemSample)),
      href,
      at: today,
      urgent: items.some(itemUrgent),
    }]
  }

  return items.map((item) => ({
    kind,
    refId: `${itemId(item)}:${today}`,
    title: itemTitle(item),
    detail: itemDetail(item),
    href,
    at: today,
    urgent: itemUrgent(item),
  }))
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const supabase = createServiceClient()
  const settings = await getStoreSettings()

  const today = todayInStoreTz()
  const daysAhead = settings?.notif_bill_days_ahead ?? 7
  const graceDays = settings?.notif_bill_grace_days ?? 1

  const wantOrders = settings === null || settings.notif_new_order
  const wantStock = settings === null || settings.notif_low_stock
  const wantMaterial = settings === null || settings.notif_low_material

  const [accountsRes, ordersRes, variantsRes, materialsRes] = await Promise.all([
    supabase
      .from('accounts_payable')
      .select('id, description, amount, due_date, creditor')
      .is('paid_at', null)
      .gte('due_date', addDays(today, -graceDays))
      .lte('due_date', addDays(today, daysAhead))
      .order('due_date'),

    wantOrders
      ? supabase
          .from('orders')
          .select('id, type, total_amount, created_at, buyer_name, customer:customers(name)')
          .gte('created_at', `${addDays(today, -NEW_ORDER_WINDOW_DAYS)}T00:00:00Z`)
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),

    wantStock
      ? supabase
          .from('product_variants')
          .select('id, sku, stock_quantity, product:products(name)')
          .lte('stock_quantity', LOW_STOCK_THRESHOLD)
          .order('stock_quantity')
          .limit(50)
      : Promise.resolve({ data: [], error: null }),

    wantMaterial
      ? supabase
          .from('raw_materials')
          .select('id, name, category, color, unit, stock_quantity, minimum_stock')
          .gt('minimum_stock', 0)
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ])

  const notifications: AdminNotification[] = []

  // ── Contas a pagar ────────────────────────────────────────────────────────
  type AccountRaw = { id: string; description: string; amount: number; due_date: string; creditor: string | null }
  for (const a of ((accountsRes.data ?? []) as unknown as AccountRaw[])) {
    const overdue = a.due_date < today
    const dueToday = a.due_date === today
    notifications.push({
      kind: 'account_due',
      refId: `${a.id}:${today}`,
      title: overdue ? `Conta vencida: ${a.description}` : `Conta a pagar: ${a.description}`,
      detail: `${formatBrl(Number(a.amount))} · ${
        overdue ? `venceu em ${formatDayMonth(a.due_date)}` : dueToday ? 'vence hoje' : `vence em ${formatDayMonth(a.due_date)}`
      }${a.creditor ? ` · ${a.creditor}` : ''}`,
      href: '/admin/financeiro',
      at: a.due_date,
      urgent: overdue || dueToday,
    })
  }

  // ── Pedidos novos ─────────────────────────────────────────────────────────
  type OrderRaw = {
    id: string; type: string; total_amount: number; created_at: string
    buyer_name: string | null
    customer: { name: string } | { name: string }[] | null
  }
  for (const o of ((ordersRes.data ?? []) as unknown as OrderRaw[])) {
    const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
    const shortId = o.id.replace(/-/g, '').slice(-4).toUpperCase()
    notifications.push({
      kind: 'new_order',
      refId: o.id,
      title: `Novo pedido ${o.type === 'wholesale' ? 'atacado' : 'varejo'} ${o.type === 'wholesale' ? 'A' : 'V'}-${shortId}`,
      detail: `${(o.buyer_name as string | null) ?? customer?.name ?? 'Cliente'} · ${formatBrl(Number(o.total_amount))}`,
      href: '/admin/pedidos',
      at: o.created_at,
      urgent: false,
    })
  }

  // ── Estoque acabado baixo ─────────────────────────────────────────────────
  type VariantRaw = { id: string; sku: string; stock_quantity: number; product: { name: string } | { name: string }[] | null }
  const lowVariants = (variantsRes.data ?? []) as unknown as VariantRaw[]

  notifications.push(
    ...summarizeOrList({
      kind: 'low_stock',
      today,
      href: '/admin/estoque',
      items: lowVariants,
      groupTitle: (n) => `${n} variantes com estoque baixo`,
      groupDetail: (sample) => `Começando por ${sample.join(', ')}`,
      itemTitle: (v) => {
        const product = Array.isArray(v.product) ? v.product[0] : v.product
        return v.stock_quantity === 0
          ? `Esgotado: ${product?.name ?? v.sku}`
          : `Estoque baixo: ${product?.name ?? v.sku}`
      },
      itemDetail: (v) => `${v.sku} · ${v.stock_quantity} ${v.stock_quantity === 1 ? 'unidade' : 'unidades'}`,
      itemSample: (v) => v.sku,
      itemId: (v) => v.id,
      itemUrgent: (v) => v.stock_quantity === 0,
    }),
  )

  // ── Matéria-prima abaixo do mínimo ────────────────────────────────────────
  type MaterialRaw = {
    id: string; name: string; category: string; color: string | null
    unit: string; stock_quantity: number; minimum_stock: number
  }
  // O filtro é coluna contra coluna, o que o PostgREST não faz no .lt(); por
  // isso a comparação acontece aqui.
  const lowMaterials = ((materialsRes.data ?? []) as unknown as MaterialRaw[])
    .filter((m) => Number(m.stock_quantity) < Number(m.minimum_stock))

  notifications.push(
    ...summarizeOrList({
      kind: 'low_material',
      today,
      href: '/admin/materias',
      items: lowMaterials,
      groupTitle: (n) => `${n} matérias-primas abaixo do mínimo`,
      groupDetail: (sample) => `Começando por ${sample.join(', ')}`,
      itemTitle: (m) => `Matéria-prima baixa: ${m.name}`,
      itemDetail: (m) =>
        `${m.category}${m.color ? ` · ${m.color}` : ''} · ${Number(m.stock_quantity).toLocaleString('pt-BR')} de ${Number(m.minimum_stock).toLocaleString('pt-BR')} ${m.unit}`,
      itemSample: (m) => m.name,
      itemId: (m) => m.id,
      itemUrgent: (m) => Number(m.stock_quantity) <= 0,
    }),
  )

  if (notifications.length === 0) return []

  // ── Tira o que já foi lido ────────────────────────────────────────────────
  const { data: reads } = await supabase
    .from('notification_reads')
    .select('kind, ref_id')
    .in('ref_id', notifications.map((n) => n.refId))

  const readKeys = new Set(
    ((reads ?? []) as Array<{ kind: string; ref_id: string }>).map((r) => `${r.kind}|${r.ref_id}`),
  )

  return notifications
    .filter((n) => !readKeys.has(`${n.kind}|${n.refId}`))
    .sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
      return b.at.localeCompare(a.at)
    })
}

export async function markNotificationRead(kind: NotificationKind, refId: string): Promise<void> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  // Upsert na chave única: marcar duas vezes não pode virar duas linhas.
  await supabase
    .from('notification_reads')
    .upsert({ kind, ref_id: refId, read_at: now }, { onConflict: 'kind,ref_id' })
}

export async function markAllNotificationsRead(): Promise<void> {
  const pending = await getAdminNotifications()
  if (pending.length === 0) return

  const supabase = createServiceClient()
  const now = new Date().toISOString()
  await supabase.from('notification_reads').upsert(
    pending.map((n) => ({ kind: n.kind, ref_id: n.refId, read_at: now })),
    { onConflict: 'kind,ref_id' },
  )
}
