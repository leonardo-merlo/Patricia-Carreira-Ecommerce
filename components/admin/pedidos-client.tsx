"use client" // tabs + expanded rows + wholesale creation modal

import { Fragment, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import { toCsv, downloadCsv } from '@/lib/csv'
import type {
  RetailOrderRow,
  WholesaleOrderRow,
  WholesaleCustomer,
  WholesaleVariant,
} from '@/lib/supabase/admin-queries'
import { createWholesaleOrder, previewOrderCheck, type ItemCheckResult } from '@/lib/actions/wholesale'
import { createPurchaseRequests } from '@/lib/actions/raw-materials'
import { updateOrderStatus } from '@/lib/actions/orders'
import { generateShippingLabel, getLabelPrintUrl } from '@/lib/actions/label'
import { emitirNfe } from '@/lib/actions/nfe'
import { CancelarPedidoModal } from '@/components/admin/cancelar-pedido-modal'
import { cancellationReasonLabel } from '@/lib/cancellation-reasons'

interface PedidosClientProps {
  varejo: RetailOrderRow[]
  atacado: WholesaleOrderRow[]
  wholesaleCustomers: WholesaleCustomer[]
  wholesaleVariants: WholesaleVariant[]
}

const PAYMENT_STATUS_MAP: Record<string, { cls: string; txt: string }> = {
  pending: { cls: 'pendente', txt: 'Pendente' },
  paid: { cls: 'pago', txt: 'Pago' },
  failed: { cls: 'cancelado', txt: 'Falhou' },
}

const ENTREGA_MAP: Record<string, { cls: string; txt: string }> = {
  pending: { cls: 'neutral', txt: '—' },
  paid: { cls: 'neutral', txt: 'A preparar' },
  separating: { cls: 'pendente', txt: 'Separando' },
  shipped: { cls: 'pago', txt: 'Enviado' },
  delivered: { cls: 'enviado', txt: 'Entregue' },
  cancelled: { cls: 'cancelado', txt: 'Cancelado' },
}

const ATACADO_STATUS: Record<string, { cls: string; txt: string }> = {
  pending: { cls: 'pendente', txt: 'Pendente' },
  confirmed: { cls: 'varejo', txt: 'Confirmado' },
  in_production: { cls: 'producao', txt: 'Em Produção' },
  shipped: { cls: 'pago', txt: 'Enviado' },
  delivered: { cls: 'enviado', txt: 'Entregue' },
  cancelled: { cls: 'cancelado', txt: 'Cancelado' },
}

const SCENARIO_CONFIG = {
  A: { cls: 'pago', icon: 'checkCircle', label: 'Estoque disponível' },
  B: { cls: 'varejo', icon: 'factory', label: 'Produzir (acabamento)' },
  C: { cls: 'pendente', icon: 'alert', label: 'Produzir (corte + acabamento)' },
  D: { cls: 'cancelado', icon: 'xCircle', label: 'Compra necessária' },
} as const

function getPaymentMethodLabel(method: string | null): string {
  if (!method) return '—'
  return { pix: 'PIX', credit_card: 'Cartão de crédito', boleto: 'Boleto' }[method] ?? method
}

const NFE_STATUS_MAP: Record<string, { cls: string; txt: string }> = {
  pending:     { cls: 'neutral',   txt: 'NF-e pendente' },
  processando: { cls: 'pendente',  txt: 'Emitindo...' },
  autorizado:  { cls: 'pago',      txt: 'NF-e emitida' },
  erro:        { cls: 'cancelado', txt: 'Erro na emissão' },
  cancelado:   { cls: 'neutral',   txt: 'Cancelada' },
  denegado:    { cls: 'cancelado', txt: 'Denegada' },
}

function NFeBadge({ status }: { status: string }) {
  const s = NFE_STATUS_MAP[status] ?? { cls: 'neutral', txt: status }
  return <span className={`badge ${s.cls}`}><span className="dot" />{s.txt}</span>
}

/**
 * Nome do cliente na linha do pedido, levando para a ficha dele. O stopPropagation
 * é o que impede o clique no link de também abrir o card do pedido.
 */
function CustomerLink({ customerId, name }: { customerId: string | null; name: string }) {
  if (!customerId) return <div style={{ fontWeight: 500 }}>{name}</div>
  return (
    <Link
      href={`/admin/clientes?cliente=${customerId}`}
      onClick={(e) => e.stopPropagation()}
      className="customer-link"
      title={`Ver ${name} em Clientes`}
    >
      {name}
    </Link>
  )
}

/**
 * Exporta o que está na tela. Segue o mesmo formato de Clientes e Estoque:
 * cabeçalho em português e número com vírgula, para abrir no Excel em pt-BR.
 */
function exportPedidosCsv(
  tab: 'varejo' | 'atacado',
  varejo: RetailOrderRow[],
  atacado: WholesaleOrderRow[],
): void {
  const money = (n: number) => n.toFixed(2).replace('.', ',')

  if (tab === 'varejo') {
    const headers = ['Pedido', 'Data', 'Hora', 'Cliente', 'Cidade/UF', 'Itens', 'Total (R$)', 'Pagamento', 'Forma', 'Entrega', 'Rastreio', 'NF-e', 'Motivo do cancelamento']
    const rows = varejo.map((o) => [
      o.display_num, o.date, o.time, o.customer_name, o.customer_location,
      o.item_count, money(o.total),
      PAYMENT_STATUS_MAP[o.payment_status]?.txt ?? o.payment_status,
      getPaymentMethodLabel(o.payment_method),
      ENTREGA_MAP[o.status]?.txt ?? o.status,
      o.tracking_code ?? '',
      NFE_STATUS_MAP[o.nfe_status]?.txt ?? o.nfe_status,
      cancellationReasonLabel(o.cancellation_reason) ?? '',
    ])
    downloadCsv(`pedidos-varejo-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))
    return
  }

  const headers = ['Pedido', 'Data', 'Cliente', 'CNPJ', 'Itens', 'Total (R$)', 'Status', 'NF-e', 'Observações', 'Motivo do cancelamento']
  const rows = atacado.map((o) => [
    o.display_num, o.date, o.customer_name, o.customer_cnpj ?? '',
    o.item_count, money(o.total),
    ATACADO_STATUS[o.status]?.txt ?? o.status,
    NFE_STATUS_MAP[o.nfe_status]?.txt ?? o.nfe_status,
    o.notes ?? '',
    cancellationReasonLabel(o.cancellation_reason) ?? '',
  ])
  downloadCsv(`pedidos-atacado-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))
}

type LineItem = { variantId: string; qty: number }

type PeriodoFiltro = 'todos' | 'hoje' | '7dias' | 'mes' | 'mesPassado' | 'personalizado'

const PERIODO_OPCOES: Array<{ value: PeriodoFiltro; label: string }> = [
  { value: 'todos', label: 'Todo o período' },
  { value: 'hoje', label: 'Hoje' },
  { value: '7dias', label: 'Últimos 7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'mesPassado', label: 'Mês passado' },
  { value: 'personalizado', label: 'Escolher datas...' },
]

// Só os status que um pedido de varejo realmente assume.
const ENTREGA_OPCOES: Array<{ value: string; label: string }> = [
  { value: 'paid', label: 'A preparar' },
  { value: 'separating', label: 'Separando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
]

const PAGAMENTO_OPCOES: Array<{ value: string; label: string }> = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'failed', label: 'Falhou' },
]

export function PedidosClient({ varejo, atacado, wholesaleCustomers, wholesaleVariants }: PedidosClientProps) {
  const [tab, setTab] = useState<'varejo' | 'atacado'>('varejo')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Atacado: dropdown de ações por pedido
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null)
  const [pagamentoFilter, setPagamentoFilter] = useState('')
  const [entregaFilter, setEntregaFilter] = useState('')
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('todos')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  // Pedido em cancelamento: guarda o que o modal precisa para se explicar.
  const [cancelTarget, setCancelTarget] = useState<{ id: string; num: string; isPaid: boolean } | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)

  // Wholesale creation modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createStep, setCreateStep] = useState<'form' | 'preview' | 'result'>('form')
  const [selectedCustomer, setSelectedCustomer] = useState(wholesaleCustomers[0]?.id ?? '')
  const [orderNotes, setOrderNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ variantId: wholesaleVariants[0]?.id ?? '', qty: 1 }])
  const [createError, setCreateError] = useState('')
  const [checkResult, setCheckResult] = useState<ItemCheckResult[]>([])
  const [createdOrderId, setCreatedOrderId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [labelLoading, setLabelLoading] = useState<string | null>(null) // order id being processed
  const [labelError, setLabelError] = useState<Record<string, string>>({}) // orderId → error
  const [nfeLoading, setNfeLoading] = useState<string | null>(null) // orderId em processamento
  const [nfeError, setNfeError] = useState<Record<string, string>>({}) // orderId → mensagem de erro
  const [opCreated, setOpCreated] = useState(false)
  const [opError, setOpError] = useState('')
  const [purchasesCreated, setPurchasesCreated] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  // Preview state (antes de salvar)
  const [previewCheck, setPreviewCheck] = useState<ItemCheckResult[]>([])
  const [previewError, setPreviewError] = useState('')

  // Intervalo [início, fim) do período escolhido. Fim exclusivo evita perder as
  // compras da última hora do dia, que é o erro clássico de comparar só a data.
  const periodoRange = useMemo((): { de: Date; ate: Date } | null => {
    const agora = new Date()
    const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (periodo === 'hoje') {
      const de = inicioDoDia(agora)
      return { de, ate: new Date(de.getTime() + 24 * 60 * 60 * 1000) }
    }
    if (periodo === '7dias') {
      const ate = new Date(inicioDoDia(agora).getTime() + 24 * 60 * 60 * 1000)
      return { de: new Date(ate.getTime() - 7 * 24 * 60 * 60 * 1000), ate }
    }
    if (periodo === 'mes') {
      return {
        de: new Date(agora.getFullYear(), agora.getMonth(), 1),
        ate: new Date(agora.getFullYear(), agora.getMonth() + 1, 1),
      }
    }
    if (periodo === 'mesPassado') {
      return {
        de: new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
        ate: new Date(agora.getFullYear(), agora.getMonth(), 1),
      }
    }
    if (periodo === 'personalizado' && (dataDe || dataAte)) {
      // Sem uma das pontas o intervalo fica aberto daquele lado.
      const de = dataDe ? new Date(`${dataDe}T00:00:00`) : new Date(0)
      const ate = dataAte
        ? new Date(new Date(`${dataAte}T00:00:00`).getTime() + 24 * 60 * 60 * 1000)
        : new Date(8640000000000000)
      return { de, ate }
    }
    return null
  }, [periodo, dataDe, dataAte])

  const filteredVarejo = varejo.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (pagamentoFilter && o.payment_status !== pagamentoFilter) return false
    if (entregaFilter && o.status !== entregaFilter) return false

    if (periodoRange) {
      const criadoEm = new Date(o.created_at)
      if (criadoEm < periodoRange.de || criadoEm >= periodoRange.ate) return false
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase()
      if (!o.customer_name.toLowerCase().includes(q) && !o.display_num.toLowerCase().includes(q)) return false
    }
    return true
  })

  const varejoTotal = filteredVarejo.reduce((s, o) => s + o.total, 0)
  const filtrosAtivos =
    Boolean(pagamentoFilter) || Boolean(entregaFilter) || periodo !== 'todos' || Boolean(searchFilter.trim())

  function limparFiltros() {
    setPagamentoFilter('')
    setEntregaFilter('')
    setPeriodo('todos')
    setDataDe('')
    setDataAte('')
    setSearchFilter('')
  }

  function addLine() {
    setLineItems((prev) => [...prev, { variantId: wholesaleVariants[0]?.id ?? '', qty: 1 }])
  }

  function removeLine(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function openCreateModal() {
    setShowCreateModal(true)
    setCreateStep('form')
    setCreateError('')
    setCheckResult([])
    setCreatedOrderId('')
    setOpCreated(false)
    setOpError('')
    setPurchasesCreated(false)
    setPurchaseError('')
    setPreviewCheck([])
    setPreviewError('')
    setLineItems([{ variantId: wholesaleVariants[0]?.id ?? '', qty: 1 }])
    setOrderNotes('')
    setSelectedCustomer(wholesaleCustomers[0]?.id ?? '')
  }

  function handlePreview() {
    if (!selectedCustomer) { setCreateError('Selecione um cliente'); return }
    if (lineItems.some((it) => !it.variantId || it.qty < 1)) { setCreateError('Verifique os itens'); return }
    setCreateError('')
    setPreviewError('')

    startTransition(async () => {
      const res = await previewOrderCheck({
        items: lineItems.map((it) => ({ variant_id: it.variantId, quantity: it.qty })),
      })
      if (!res.success) {
        setPreviewError(res.error)
        return
      }
      setPreviewCheck(res.check)
      setCreateStep('preview')
    })
  }

  function handleSubmitOrder() {
    if (!selectedCustomer) { setCreateError('Selecione um cliente'); return }
    if (lineItems.some((it) => !it.variantId || it.qty < 1)) { setCreateError('Verifique os itens'); return }
    setCreateError('')

    startTransition(async () => {
      const items = lineItems.map((it) => {
        const v = wholesaleVariants.find((vv) => vv.id === it.variantId)!
        return {
          variant_id: it.variantId,
          product_name: v.product_name,
          variant_label: v.label.replace(`${v.product_name} — `, ''),
          quantity: it.qty,
          unit_price: v.wholesale_price,
        }
      })

      const res = await createWholesaleOrder({ customer_id: selectedCustomer, notes: orderNotes, items })

      if (!res.success) {
        setCreateError(res.error)
        return
      }

      setCreatedOrderId(res.order_id)
      setCheckResult(res.check)
      // OPs are auto-created inside createWholesaleOrder for scenarios B/C
      const hasProduction = res.check.some((r) => r.scenario === 'B' || r.scenario === 'C')
      if (hasProduction) setOpCreated(true)
      setCreateStep('result')
    })
  }

  function handleCreatePurchases() {
    const allPurchases = checkResult.flatMap((r) => r.items_to_purchase)
    if (allPurchases.length === 0) return
    setPurchaseError('')

    startTransition(async () => {
      const res = await createPurchaseRequests(
        allPurchases.map((p) => ({
          order_id: createdOrderId,
          raw_material_id: p.material_id,
          material_name: p.material_name,
          quantity_needed: p.quantity_to_buy,
          unit: p.unit,
        })),
      )
      if (!res.success) {
        setPurchaseError(res.error)
      } else {
        setPurchasesCreated(true)
      }
    })
  }

  const orderTotal = lineItems.reduce((sum, it) => {
    const v = wholesaleVariants.find((vv) => vv.id === it.variantId)
    return sum + (v ? v.wholesale_price * it.qty : 0)
  }, 0)

  const hasItemsToPurchase = checkResult.some((r) => r.items_to_purchase.length > 0)
  const hasMaterialsToRegister = checkResult.some((r) => r.materials_to_register.length > 0)
  const needsAnyMaterial = checkResult.some((r) => r.bom_check.some((b) => !b.is_sufficient))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Pedidos</h2>
          <p className="page-sub">
            {varejo.length} pedido{varejo.length !== 1 ? 's' : ''} varejo · {atacado.length} pedido{atacado.length !== 1 ? 's' : ''} atacado
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" id="btn-exportar-pedidos" onClick={() => exportPedidosCsv(tab, filteredVarejo, atacado)}>
            <AdminIcon name="download" /> Exportar
          </button>
          {tab === 'atacado' && (
            <button className="btn primary" id="btn-novo-pedido-atacado" onClick={openCreateModal}>
              <AdminIcon name="plus" /> Novo pedido atacado
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'varejo' ? 'active' : ''}`} onClick={() => setTab('varejo')}>
          <AdminIcon name="cart" size={13} /> Varejo <span className="count">{varejo.length}</span>
        </button>
        <button className={`tab ${tab === 'atacado' ? 'active' : ''}`} onClick={() => setTab('atacado')}>
          <AdminIcon name="truck" size={13} /> Atacado (Manual) <span className="count">{atacado.length}</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, flex: 1, flexWrap: 'wrap' }}>
            <div className="search-input" style={{ width: 240 }}>
              <AdminIcon name="search" size={13} />
              <input
                placeholder={tab === 'varejo' ? 'Buscar por cliente ou pedido...' : 'Buscar por cliente...'}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                data-testid="filtro-busca-pedidos"
              />
            </div>

            {tab === 'varejo' && (
              <>
                <select
                  className="select"
                  id="filtro-periodo"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
                  // .select tem width:100% no admin.css — sem largura inline os
                  // filtros quebram linha e ocupam a barra inteira.
                  style={{ width: 152, flex: '0 0 auto' }}
                >
                  {PERIODO_OPCOES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                {periodo === 'personalizado' && (
                  <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                    <input
                      className="input"
                      id="filtro-data-de"
                      type="date"
                      value={dataDe}
                      max={dataAte || undefined}
                      onChange={(e) => setDataDe(e.target.value)}
                      aria-label="Data inicial"
                      style={{ width: 140, flex: '0 0 auto' }}
                    />
                    <span className="cust-meta">até</span>
                    <input
                      className="input"
                      id="filtro-data-ate"
                      type="date"
                      value={dataAte}
                      min={dataDe || undefined}
                      onChange={(e) => setDataAte(e.target.value)}
                      aria-label="Data final"
                      style={{ width: 140, flex: '0 0 auto' }}
                    />
                  </div>
                )}

                <select
                  className="select"
                  id="filtro-pagamento"
                  value={pagamentoFilter}
                  onChange={(e) => setPagamentoFilter(e.target.value)}
                  style={{ width: 148, flex: '0 0 auto' }}
                >
                  <option value="">Todo pagamento</option>
                  {PAGAMENTO_OPCOES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                <select
                  className="select"
                  id="filtro-entrega"
                  value={entregaFilter}
                  onChange={(e) => setEntregaFilter(e.target.value)}
                  style={{ width: 148, flex: '0 0 auto' }}
                >
                  <option value="">Toda entrega</option>
                  {ENTREGA_OPCOES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                {filtrosAtivos && (
                  <button className="linkish" id="btn-limpar-filtros" onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                )}
              </>
            )}
          </div>
          {tab === 'varejo' && (
            <div className="cust-meta">
              {filtrosAtivos && (
                <span style={{ marginRight: 10 }}>
                  {filteredVarejo.length} de {varejo.length}
                </span>
              )}
              Total: <b style={{ color: 'var(--text)' }}>{formatPrice(varejoTotal)}</b>
            </div>
          )}
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                {tab === 'varejo' ? (
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th style={{ width: 90 }}>#</th>
                    <th style={{ width: 82 }}>Data</th>
                    <th>Cliente</th>
                    <th style={{ width: 70 }}>Itens</th>
                    <th style={{ width: 110 }}>Total</th>
                    <th style={{ width: 110 }}>Pagamento</th>
                    <th style={{ width: 110 }}>Entrega</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th style={{ width: 90 }}>#</th>
                    <th style={{ width: 70 }}>Data</th>
                    <th>Cliente</th>
                    <th style={{ width: 70 }}>Itens</th>
                    <th style={{ width: 110 }}>Total</th>
                    <th style={{ width: 130 }}>Status</th>
                    <th style={{ width: 80 }}>Ações</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tab === 'varejo' && (
                  filteredVarejo.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-3)' }}>Nenhum pedido encontrado.</td></tr>
                  ) : filteredVarejo.map((o) => {
                    const isExpanded = expandedOrder === o.id
                    const initials = o.customer_name.split(' ').map((s) => s[0]).slice(0, 2).join('')
                    const payBadge = PAYMENT_STATUS_MAP[o.payment_status] ?? { cls: 'neutral', txt: o.payment_status }
                    const entrega = ENTREGA_MAP[o.status] ?? { cls: 'neutral', txt: '—' }
                    return (
                      <Fragment key={o.id}>
                        <tr
                          className={`row-clickable ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                        >
                          <td>
                            <button
                              className="icon-btn"
                              aria-label={isExpanded ? 'Fechar detalhes do pedido' : 'Ver detalhes do pedido'}
                              aria-expanded={isExpanded}
                              onClick={(e) => { e.stopPropagation(); setExpandedOrder(isExpanded ? null : o.id) }}
                            >
                              <AdminIcon name={isExpanded ? 'chevDown' : 'chevRight'} size={12} />
                            </button>
                          </td>
                          <td><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'var(--text-2)' }}>{o.display_num}</span></td>
                          <td>
                            <div>{o.date}</div>
                            <div className="cust-meta tiny" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.time}</div>
                          </td>
                          <td>
                            <div className="row" style={{ gap: 8 }}>
                              <div className="thumb" style={{ width: 22, height: 22, fontSize: 9, background: 'linear-gradient(135deg,#c4b98f,#8a7f4a)', color: '#fff' }}>{initials}</div>
                              <div>
                                <CustomerLink customerId={o.customer_id} name={o.customer_name} />
                                <div className="cust-meta">{o.customer_location}</div>
                              </div>
                            </div>
                          </td>
                          <td className="num">{o.item_count}</td>
                          <td className="num" style={{ fontWeight: 500 }}>{formatPrice(o.total)}</td>
                          <td><span className={`badge ${payBadge.cls}`}><span className="dot" />{payBadge.txt}</span></td>
                          <td>{entrega.txt === '—' ? <span className="cust-meta">—</span> : <span className={`badge ${entrega.cls}`}><span className="dot" />{entrega.txt}</span>}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ padding: 0, borderBottom: 'none' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                                <div style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
                                  <div className="cust-meta" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Itens</div>
                                  {o.items.map((it, idx) => (
                                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: idx < o.items.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                                      <div className="thumb bag" style={{ width: 28, height: 28, flexShrink: 0 }}><AdminIcon name="bag" size={12} /></div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.name}</div>
                                        <div className="cust-meta tiny">{it.sku} · Qtd. {it.quantity}</div>
                                      </div>
                                      <div className="num" style={{ fontSize: 12.5, flexShrink: 0 }}>{formatPrice(it.unit_price)}</div>
                                    </div>
                                  ))}
                                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                                    <span>Total</span><span>{formatPrice(o.total)}</span>
                                  </div>
                                </div>
                                <div style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
                                  <div className="cust-meta" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Endereço</div>
                                  {o.address ? (
                                    <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                                      <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                                      <div>{o.address.street}, {o.address.number}{o.address.complement ? `, ${o.address.complement}` : ''}</div>
                                      <div>{o.address.neighborhood} · {o.address.city}/{o.address.state}</div>
                                      <div>CEP {o.address.zip}</div>
                                    </div>
                                  ) : <div className="cust-meta">Não disponível</div>}
                                </div>
                                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                  <div>
                                    <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Pagamento</div>
                                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{getPaymentMethodLabel(o.payment_method)}</div>
                                    <div style={{ marginTop: 3 }}>
                                      {(() => { const p = PAYMENT_STATUS_MAP[o.payment_status] ?? { cls: 'neutral', txt: o.payment_status }; return <span className={`badge ${p.cls}`} style={{ fontSize: 11 }}><span className="dot" />{p.txt}</span> })()}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Rastreio</div>
                                    {o.tracking_code ? (
                                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em' }}>{o.tracking_code}</div>
                                    ) : (
                                      <div className="cust-meta">Não disponível</div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Nota Fiscal</div>
                                    <div style={{ marginBottom: nfeError[o.id] ? 6 : 0 }}>
                                      <NFeBadge status={o.nfe_status} />
                                    </div>
                                    {o.nfe_status === 'autorizado' && o.nfe_url && (
                                      <a href={o.nfe_url} target="_blank" rel="noopener noreferrer"
                                        className="btn" style={{ fontSize: 12, padding: '5px 10px', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <AdminIcon name="download" size={11} />
                                        Baixar DANFE
                                      </a>
                                    )}
                                    {(o.nfe_status === 'erro' || o.nfe_status === 'pending') && o.payment_status === 'paid' && (
                                      <button className="btn" style={{ fontSize: 12, padding: '5px 10px', marginTop: 6 }}
                                        id={`btn-emitir-nfe-${o.id}`}
                                        data-testid="btn-emitir-nfe"
                                        disabled={nfeLoading === o.id}
                                        onClick={async () => {
                                          setNfeLoading(o.id)
                                          setNfeError((prev) => ({ ...prev, [o.id]: '' }))
                                          const res = await emitirNfe(o.id)
                                          setNfeLoading(null)
                                          if (!res.success) {
                                            setNfeError((prev) => ({ ...prev, [o.id]: res.error ?? 'Erro desconhecido' }))
                                          } else {
                                            window.location.reload()
                                          }
                                        }}
                                      >
                                        <AdminIcon name="checkCircle" size={11} />
                                        {nfeLoading === o.id ? 'Emitindo...' : o.nfe_status === 'erro' ? 'Tentar novamente' : 'Emitir NF-e'}
                                      </button>
                                    )}
                                    {nfeError[o.id] && (
                                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{nfeError[o.id]}</div>
                                    )}
                                  </div>
                                  {o.melhor_envio_order_id && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {!o.tracking_code && (
                                        <button
                                          className="btn"
                                          style={{ fontSize: 12, padding: '5px 10px' }}
                                          disabled={labelLoading === o.id}
                                          onClick={async () => {
                                            setLabelLoading(o.id)
                                            setLabelError((prev) => ({ ...prev, [o.id]: '' }))
                                            const res = await generateShippingLabel(o.id, o.melhor_envio_order_id!)
                                            setLabelLoading(null)
                                            if (!res.ok) {
                                              setLabelError((prev) => ({ ...prev, [o.id]: res.error }))
                                            } else {
                                              window.location.reload()
                                            }
                                          }}
                                        >
                                          <AdminIcon name="truck" size={11} />
                                          {labelLoading === o.id ? 'Gerando...' : 'Gerar Etiqueta'}
                                        </button>
                                      )}
                                      <button
                                        className="btn"
                                        style={{ fontSize: 12, padding: '5px 10px' }}
                                        disabled={labelLoading === o.id}
                                        onClick={async () => {
                                          setLabelLoading(o.id)
                                          const res = await getLabelPrintUrl(o.melhor_envio_order_id!)
                                          setLabelLoading(null)
                                          if (res.ok) {
                                            window.open(res.url, '_blank')
                                          } else {
                                            setLabelError((prev) => ({ ...prev, [o.id]: res.error }))
                                          }
                                        }}
                                      >
                                        <AdminIcon name="download" size={11} />
                                        Imprimir Etiqueta
                                      </button>
                                      {labelError[o.id] && (
                                        <div style={{ fontSize: 11, color: 'var(--red)' }}>{labelError[o.id]}</div>
                                      )}
                                    </div>
                                  )}

                                  {/* Cancelar existia só no atacado. No varejo é o que
                                      estorna o estoque e avisa a cliente por email. */}
                                  {o.status === 'cancelled' ? (
                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                                      <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Cancelamento</div>
                                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                                        {cancellationReasonLabel(o.cancellation_reason) ?? 'Motivo não registrado'}
                                      </div>
                                      {o.cancellation_notes && (
                                        <div className="cust-meta" style={{ marginTop: 3, whiteSpace: 'pre-wrap' }}>{o.cancellation_notes}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                                      <button
                                        className="linkish"
                                        style={{ fontSize: 12, color: 'var(--red)' }}
                                        id={`btn-cancelar-pedido-${o.id}`}
                                        onClick={() => setCancelTarget({ id: o.id, num: o.display_num, isPaid: o.payment_status === 'paid' })}
                                      >
                                        <AdminIcon name="xCircle" size={11} /> Cancelar pedido
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}

                {tab === 'atacado' && (
                  atacado.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-3)' }}>Nenhum pedido atacado. Clique em &quot;Novo pedido atacado&quot; para criar.</td></tr>
                  ) : atacado.map((o) => {
                    const s = ATACADO_STATUS[o.status] ?? { cls: 'neutral', txt: o.status }
                    const initials = o.customer_name.split(' ').map((x) => x[0]).slice(0, 2).join('')
                    const isOpen = openActionsFor === o.id
                    const isExpanded = expandedOrder === o.id
                    return (
                      <Fragment key={o.id}>
                        <tr
                          className={`row-clickable ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                        >
                          <td>
                            <button
                              className="icon-btn"
                              aria-label={isExpanded ? 'Fechar detalhes do pedido' : 'Ver detalhes do pedido'}
                              aria-expanded={isExpanded}
                              data-testid="btn-ver-detalhes-atacado"
                              onClick={(e) => { e.stopPropagation(); setExpandedOrder(isExpanded ? null : o.id) }}
                            >
                              <AdminIcon name={isExpanded ? 'chevDown' : 'chevRight'} size={12} />
                            </button>
                          </td>
                          <td><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'var(--text-2)' }}>{o.display_num}</span></td>
                          <td>{o.date}</td>
                          <td>
                            <div className="row" style={{ gap: 8 }}>
                              <div className="thumb" style={{ width: 22, height: 22, fontSize: 9, background: 'linear-gradient(135deg,#d8c89a,#a08956)', color: '#fff' }}>{initials}</div>
                              <div>
                                <CustomerLink customerId={o.customer_id} name={o.customer_name} />
                                {o.customer_cnpj && <div className="cust-meta">{o.customer_cnpj}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="num">{o.item_count}</td>
                          <td className="num" style={{ fontWeight: 500 }}>{formatPrice(o.total)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span className={`badge ${s.cls}`}><span className="dot" />{s.txt}</span>
                              {o.nfe_status === 'autorizado' && (
                                <span className="badge pago" style={{ fontSize: 10.5 }}><span className="dot" />NF-e ✓</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              <button
                                className={`icon-btn ${isOpen ? 'active' : ''}`}
                                title="Ações do pedido"
                                aria-label="Ações do pedido"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isOpen) {
                                    setOpenActionsFor(null)
                                    setDropdownPos(null)
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setOpenActionsFor(o.id)
                                    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                  }
                                }}
                              >
                                <AdminIcon name="edit" size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ padding: 0, borderBottom: 'none' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                                <div style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
                                  <div className="cust-meta" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Itens</div>
                                  {o.items.map((it, idx) => (
                                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: idx < o.items.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                                      <div className="thumb bag" style={{ width: 28, height: 28, flexShrink: 0 }}><AdminIcon name="bag" size={12} /></div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.name}</div>
                                        <div className="cust-meta tiny">{it.sku} · Qtd. {it.quantity}</div>
                                      </div>
                                      <div className="num" style={{ fontSize: 12.5, flexShrink: 0 }}>{formatPrice(it.unit_price)}</div>
                                    </div>
                                  ))}
                                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                                    <span>Total</span><span>{formatPrice(o.total)}</span>
                                  </div>
                                </div>
                                <div style={{ padding: 16 }}>
                                  <div className="cust-meta" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Observações</div>
                                  {o.notes ? (
                                    <div data-testid="texto-observacoes-atacado" style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{o.notes}</div>
                                  ) : (
                                    <div className="cust-meta">Nenhuma observação registrada.</div>
                                  )}

                                  {o.status === 'cancelled' && (
                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                                      <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Cancelamento</div>
                                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                                        {cancellationReasonLabel(o.cancellation_reason) ?? 'Motivo não registrado'}
                                      </div>
                                      {o.cancellation_notes && (
                                        <div className="cust-meta" style={{ marginTop: 3, whiteSpace: 'pre-wrap' }}>{o.cancellation_notes}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Dropdown de ações atacado (fixed, fora da tabela) ── */}
      {openActionsFor && dropdownPos && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => { setOpenActionsFor(null); setDropdownPos(null) }}
          />
          <div style={{
            position: 'fixed',
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 50,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,.14)',
            minWidth: 190,
            padding: '4px 0',
          }}>
            {(() => {
              const currentOrder = atacado.find((o) => o.id === openActionsFor)
              const showNfe = currentOrder && (currentOrder.nfe_status === 'pending' || currentOrder.nfe_status === 'erro')
              return (
                <>
                  {[
                    { label: 'Confirmar pedido', value: 'confirmed', icon: 'checkCircle' as const },
                    { label: 'Em produção', value: 'in_production', icon: 'factory' as const },
                    { label: 'Enviado', value: 'shipped', icon: 'truck' as const },
                    { label: 'Entregue', value: 'delivered', icon: 'check' as const },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '8px 14px', fontSize: 12.5,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text)', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      disabled={statusLoading === openActionsFor}
                      onClick={async () => {
                        setStatusLoading(openActionsFor)
                        await updateOrderStatus(openActionsFor!, opt.value)
                        setStatusLoading(null)
                        setOpenActionsFor(null)
                        setDropdownPos(null)
                      }}
                    >
                      <AdminIcon name={opt.icon} size={13} />
                      {opt.label}
                    </button>
                  ))}
                  {showNfe && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <button
                        id="btn-emitir-nfe"
                        data-testid="btn-emitir-nfe"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '8px 14px', fontSize: 12.5,
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text)', textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        disabled={nfeLoading === openActionsFor}
                        onClick={async () => {
                          const orderId = openActionsFor!
                          setNfeLoading(orderId)
                          setOpenActionsFor(null)
                          setDropdownPos(null)
                          const res = await emitirNfe(orderId)
                          setNfeLoading(null)
                          if (!res.success) {
                            setNfeError((prev) => ({ ...prev, [orderId]: res.error ?? 'Erro desconhecido' }))
                          } else {
                            window.location.reload()
                          }
                        }}
                      >
                        <AdminIcon name="checkCircle" size={13} />
                        {nfeLoading === openActionsFor ? 'Emitindo...' : currentOrder?.nfe_status === 'erro' ? 'Tentar NF-e novamente' : 'Emitir NF-e'}
                      </button>
                    </>
                  )}
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 14px', fontSize: 12.5,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--red)', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    disabled={statusLoading === openActionsFor}
                    onClick={() => {
                      // O dropdown é apertado demais para um formulário: o motivo
                      // é obrigatório, então quem confirma é o modal.
                      if (currentOrder) {
                        setCancelTarget({
                          id: currentOrder.id,
                          num: currentOrder.display_num,
                          isPaid: currentOrder.payment_status === 'paid',
                        })
                      }
                      setOpenActionsFor(null)
                      setDropdownPos(null)
                    }}
                  >
                    <AdminIcon name="xCircle" size={13} />
                    Cancelar pedido
                  </button>
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* ── Modal: cancelamento com motivo (varejo e atacado) ── */}
      {cancelTarget && (
        <CancelarPedidoModal
          orderId={cancelTarget.id}
          displayNum={cancelTarget.num}
          isPaid={cancelTarget.isPaid}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => { setCancelTarget(null); window.location.reload() }}
        />
      )}

      {/* ── Modal: Novo Pedido Atacado ── */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => { if (!isPending) setShowCreateModal(false) }}>
          <div className="modal" style={{ width: createStep === 'result' ? 700 : 580 }} onClick={(e) => e.stopPropagation()}>

            {/* ── STEP 1: Formulário ── */}
            {createStep === 'form' && (
              <>
                <div className="modal-header">
                  <div>
                    <h3>Novo Pedido Atacado</h3>
                    <div className="sub">Preencha os dados e selecione os produtos</div>
                  </div>
                  <button className="icon-btn" onClick={() => setShowCreateModal(false)}><AdminIcon name="x" size={14} /></button>
                </div>
                <div className="modal-body">
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div className="field">
                      <label>Cliente</label>
                      <select className="select" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                        <option value="">— Selecionar —</option>
                        {wholesaleCustomers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}{c.cnpj ? ` · ${c.cnpj}` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="cust-meta" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Itens do pedido</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {lineItems.map((it, idx) => {
                          const variant = wholesaleVariants.find((v) => v.id === it.variantId)
                          return (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 32px', gap: 6, alignItems: 'center' }}>
                              <select
                                className="select"
                                value={it.variantId}
                                onChange={(e) => updateLine(idx, { variantId: e.target.value })}
                              >
                                {wholesaleVariants.map((v) => (
                                  <option key={v.id} value={v.id}>{v.label} — {formatPrice(v.wholesale_price)}</option>
                                ))}
                              </select>
                              <input
                                className="input"
                                type="number"
                                min={1}
                                value={it.qty}
                                onChange={(e) => updateLine(idx, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                                style={{ textAlign: 'right' }}
                              />
                              {lineItems.length > 1 && (
                                <button className="icon-btn" onClick={() => removeLine(idx)}><AdminIcon name="x" size={12} /></button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <button className="linkish" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5 }} onClick={addLine}>
                        <AdminIcon name="plus" size={12} /> Adicionar item
                      </button>
                    </div>

                    <div className="field">
                      <label>Observações</label>
                      <textarea className="input" rows={2} style={{ height: 'auto', padding: 8, resize: 'vertical' }} placeholder="Opcional..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', borderRadius: 6, padding: '10px 14px', fontSize: 13 }}>
                      <span className="cust-meta">Total do pedido</span>
                      <b style={{ fontSize: 15 }}>{formatPrice(orderTotal)}</b>
                    </div>

                    {createError && <div style={{ color: 'var(--red)', fontSize: 12 }}>{createError}</div>}
                    {previewError && <div style={{ color: 'var(--red)', fontSize: 12 }}>{previewError}</div>}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn ghost" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                  <button className="btn primary" onClick={handlePreview} disabled={isPending}>
                    <AdminIcon name="checkCircle" size={12} />
                    {isPending ? 'Verificando...' : 'Verificar disponibilidade →'}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: Preview — revisão antes de salvar ── */}
            {createStep === 'preview' && (
              <>
                <div className="modal-header">
                  <div>
                    <h3>Revisar Pedido</h3>
                    <div className="sub">Confira a disponibilidade e as OPs sugeridas antes de criar o pedido</div>
                  </div>
                  <button className="icon-btn" onClick={() => setShowCreateModal(false)}><AdminIcon name="x" size={14} /></button>
                </div>
                <div className="modal-body">
                  <div style={{ display: 'grid', gap: 12 }}>
                    {previewCheck.map((r) => {
                      const cfg = SCENARIO_CONFIG[r.scenario]
                      return (
                        <div key={r.variant_id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.product_name} — {r.variant_label}</div>
                              <div className="cust-meta" style={{ fontSize: 11.5 }}>{r.sku}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                              <span className={`badge ${cfg.cls}`}><span className="dot" />{cfg.label}</span>
                              <span className="cust-meta" style={{ fontSize: 11 }}>
                                {r.quantity_requested} pedido · {r.stock_available} em estoque · {r.quantity_to_produce} produzir
                              </span>
                            </div>
                          </div>

                          {/* Insumos que faltam cadastrar */}
                          {r.materials_to_register.length > 0 && (
                            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                              <div className="cust-meta" style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cadastrar antes de produzir</div>
                              {r.materials_to_register.map((m) => (
                                <div key={`${m.material_name}-${m.required_color ?? ''}`} style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                  {[m.material_name, m.required_color].filter(Boolean).join(' · ')}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Compras necessárias */}
                          {r.items_to_purchase.length > 0 && (
                            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--red-soft)' }}>
                              <div className="cust-meta" style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comprar antes de produzir</div>
                              {r.items_to_purchase.map((p) => (
                                <div key={p.material_id} style={{ fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>
                                  {p.quantity_to_buy.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {p.unit} de {p.material_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn ghost" onClick={() => setCreateStep('form')}>← Voltar</button>
                  <button className="btn primary" onClick={handleSubmitOrder} disabled={isPending}>
                    <AdminIcon name="checkCircle" size={12} />
                    {isPending ? 'Criando pedido...' : 'Criar pedido'}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Resultado ── */}
            {createStep === 'result' && (
              <>
                <div className="modal-header">
                  <div>
                    <h3>Verificação de Matérias-Primas</h3>
                    <div className="sub">Pedido criado · verificando disponibilidade de estoque e materiais</div>
                  </div>
                  <button className="icon-btn" onClick={() => setShowCreateModal(false)}><AdminIcon name="x" size={14} /></button>
                </div>
                <div className="modal-body">
                  <div style={{ display: 'grid', gap: 12 }}>
                    {checkResult.map((r) => {
                      const cfg = SCENARIO_CONFIG[r.scenario]
                      return (
                        <div key={r.variant_id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                          {/* Cabeçalho do item */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.product_name} — {r.variant_label}</div>
                              <div className="cust-meta" style={{ fontSize: 11.5 }}>{r.sku}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                              <span className={`badge ${cfg.cls}`}>
                                <span className="dot" />{cfg.label}
                              </span>
                              <span className="cust-meta" style={{ fontSize: 11 }}>
                                {r.quantity_requested} pedido · {r.stock_available} em estoque · {r.quantity_to_produce} produzir
                              </span>
                              {r.scenario === 'D' && (
                                <span className="cust-meta" style={{ fontSize: 10.5, color: 'var(--red)', fontStyle: 'italic' }}>
                                  {r.scenario_label}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Aviso: sem receita cadastrada */}
                          {r.scenario === 'D' && r.bom_check.length === 0 && (
                            <div style={{ padding: '8px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AdminIcon name="alert" size={13} style={{ color: 'var(--orange)', flexShrink: 0 }} />
                              Nenhuma receita (BOM) cadastrada para esta variante. Cadastre em{' '}
                              <a href="/admin/materias" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Matérias-Primas</a>{' '}
                              para poder produzir.
                            </div>
                          )}

                          {/* Itens do BOM check */}
                          {r.bom_check.length > 0 && (
                            <div style={{ padding: '8px 14px' }}>
                              {r.bom_check.map((b) => (
                                <div key={b.material_id ?? `${b.material_name}-${b.required_color ?? ''}`}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                                    {b.is_sufficient
                                      ? <AdminIcon name="checkCircle" size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
                                      : <AdminIcon name="xCircle" size={12} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                                    <span style={{ flex: 1, fontWeight: b.is_sufficient ? 400 : 500 }}>{b.material_name}</span>
                                    <span className="cust-meta" style={{ fontSize: 11 }}>
                                      necessário {b.needed_total.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {b.unit}
                                      {b.resolved && ` · estoque ${b.available.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}`}
                                    </span>
                                    {!b.resolved && (
                                      <span style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 11 }}>
                                        não cadastrado{b.required_color ? ` na cor ${b.required_color}` : ''}
                                      </span>
                                    )}
                                    {b.resolved && !b.is_sufficient && (
                                      <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 11 }}>
                                        faltam {b.missing.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {b.unit}
                                      </span>
                                    )}
                                  </div>
                                  {/* Recipe check (bruta para intermediária) */}
                                  {b.recipe_check && b.recipe_check.length > 0 && (
                                    <div style={{ paddingLeft: 20, borderLeft: '2px solid var(--border)', marginLeft: 6 }}>
                                      {b.recipe_check.map((rc) => (
                                        <div key={rc.material_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', fontSize: 11, color: 'var(--text-2)' }}>
                                          <AdminIcon name={rc.is_sufficient ? 'check' : 'xCircle'} size={11} style={{ color: rc.is_sufficient ? 'var(--green)' : 'var(--red)' }} />
                                          <span>{rc.material_name}</span>
                                          <span className="cust-meta">→ {rc.needed_total.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {rc.unit}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* O que precisa cadastrar — pendência de cadastro, não de compra */}
                          {r.materials_to_register.length > 0 && (
                            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                              <div className="cust-meta" style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cadastrar</div>
                              {r.materials_to_register.map((m) => (
                                <div key={`${m.material_name}-${m.required_color ?? ''}`} style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                  {[m.material_name, m.required_color].filter(Boolean).join(' · ')} — sem linha de estoque em{' '}
                                  <a href="/admin/materias" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Matérias-Primas</a>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* O que precisa comprar */}
                          {r.items_to_purchase.length > 0 && (
                            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--red-soft)' }}>
                              <div className="cust-meta" style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comprar</div>
                              {r.items_to_purchase.map((p) => (
                                <div key={p.material_id} style={{ fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>
                                  {p.quantity_to_buy.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {p.unit} de {p.material_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {opCreated && (
                    <div style={{ marginTop: 14, background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-2)', borderRadius: 6, padding: '10px 14px', fontSize: 12.5, color: '#7a4a36', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AdminIcon name="checkCircle" size={14} />
                      Ordens de produção criadas! Acesse <b>/admin/producao</b> para acompanhar.
                    </div>
                  )}
                  {opError && <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 12 }}>{opError}</div>}

                  {purchasesCreated && (
                    <div style={{ marginTop: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontSize: 12.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AdminIcon name="checkCircle" size={14} />
                      Compras registradas! Acesse <b>Matérias-Primas → Compras Pendentes</b> para acompanhar.
                    </div>
                  )}
                  {purchaseError && <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 12 }}>{purchaseError}</div>}

                  {!hasItemsToPurchase && !purchasesCreated && (
                    <div style={{ marginTop: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontSize: 12.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }} id="aviso-sem-compras" data-testid="aviso-sem-compras">
                      <AdminIcon name="info" size={14} />
                      {hasMaterialsToRegister
                        ? 'Nada a comprar por enquanto: os insumos que faltam ainda não estão cadastrados na cor desta variante. Cadastre em Matérias-Primas e verifique de novo.'
                        : needsAnyMaterial
                          ? 'Nada a comprar: os insumos em falta não têm cadastro válido.'
                          : 'Nada a comprar — o estoque de matéria-prima cobre este pedido.'}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn ghost" onClick={() => setShowCreateModal(false)}>Fechar</button>
                  {hasItemsToPurchase && !purchasesCreated && (
                    <button
                      className="btn"
                      style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                      onClick={handleCreatePurchases}
                      disabled={isPending}
                    >
                      <AdminIcon name="bag" size={12} />
                      {isPending ? 'Registrando...' : `Registrar ${checkResult.flatMap((r) => r.items_to_purchase).length} compra(s) pendente(s)`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
