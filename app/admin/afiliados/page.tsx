"use client"

import { useState, useEffect, Fragment } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { invitePartnerUser } from '@/lib/actions/partners'
import { createClient } from '@/lib/supabase/client'

type HistoryEntry = {
  month: string
  sales: number
  revenue: number
  commission: number
  paid: boolean
}

type Afiliada = {
  id: string
  name: string
  email: string
  phone: string
  coupon: string
  couponId: string | null
  commissionPct: number
  paymentDay: number | null
  isActive: boolean
  joinedDate: string
  // calculated from orders
  salesMonth: number
  revenueMonth: number
  commissionMonth: number
  totalSales: number
  totalRevenue: number
  totalCommission: number
  history: HistoryEntry[]
}

type DbPartner = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  commission_pct: number | null
  payment_day: number | null
  coupon_id: string | null
  is_active: boolean
  created_at: string
  coupons: { id: string; code: string } | null
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')},00`

const PT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatJoinDate(iso: string): string {
  const d = new Date(iso)
  return `${PT_MONTHS[d.getMonth()]}/${d.getFullYear()}`
}

export default function AfiliadadosPage() {
  const supabase = createClient()

  const [afiliadas, setAfiliadas] = useState<Afiliada[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'todas' | 'apagar' | 'pagas'>('todas')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Afiliada | null>(null)
  const [draft, setDraft] = useState<Afiliada | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [coupons, setCoupons] = useState<{ id: string; code: string }[]>([])

  // Available coupons for linking
  useEffect(() => {
    supabase.from('coupons').select('id, code').then(({ data }) => {
      if (data) setCoupons(data)
    })
  }, [])

  useEffect(() => {
    loadAfiliadas()
  }, [])

  async function loadAfiliadas() {
    setLoading(true)
    const { data: partners, error } = await supabase
      .from('partners')
      .select('id, name, contact_name, email, phone, commission_pct, payment_day, coupon_id, is_active, created_at, coupons!coupon_id(id, code)')
      .eq('type', 'affiliate')
      .order('created_at', { ascending: true })

    if (error || !partners) { setLoading(false); return }

    // For each partner with a coupon, load their order stats
    const enriched = await Promise.all((partners as unknown as DbPartner[]).map(async (p) => {
      let salesMonth = 0, revenueMonth = 0, commissionMonth = 0
      let totalSales = 0, totalRevenue = 0, totalCommission = 0
      const history: HistoryEntry[] = []
      const pct = p.commission_pct ?? 10

      if (p.coupon_id) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount, payment_status, created_at, order_items(quantity, unit_price)')
          .eq('coupon_id', p.coupon_id)
          .order('created_at', { ascending: false })

        if (orders?.length) {
          const now = new Date()
          const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

          const monthMap = new Map<string, { sales: number; revenue: number }>()

          for (const o of orders) {
            const d = new Date(o.created_at)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const prev = monthMap.get(key) ?? { sales: 0, revenue: 0 }
            const itemTotal = (o.order_items as { quantity: number; unit_price: number }[])
              .reduce((s, i) => s + i.unit_price * i.quantity, 0)
            monthMap.set(key, { sales: prev.sales + 1, revenue: prev.revenue + itemTotal })
          }

          for (const [key, m] of Array.from(monthMap.entries()).sort(([a], [b]) => b.localeCompare(a))) {
            const [yr, mo] = key.split('-')
            const label = `${PT_MONTHS[parseInt(mo) - 1]}/${yr}`
            const commission = Math.round(m.revenue * pct / 100)
            history.push({ month: label, sales: m.sales, revenue: Math.round(m.revenue), commission, paid: key !== thisMonth })
            totalSales += m.sales
            totalRevenue += m.revenue
            totalCommission += commission
            if (key === thisMonth) {
              salesMonth = m.sales
              revenueMonth = Math.round(m.revenue)
              commissionMonth = commission
            }
          }
        }
      }

      return {
        id: p.id,
        name: p.contact_name ?? p.name,
        email: p.email ?? '',
        phone: p.phone ?? '',
        coupon: p.coupons?.code ?? '—',
        couponId: p.coupon_id,
        commissionPct: pct,
        paymentDay: p.payment_day,
        isActive: p.is_active,
        joinedDate: formatJoinDate(p.created_at),
        salesMonth,
        revenueMonth,
        commissionMonth,
        totalSales,
        totalRevenue: Math.round(totalRevenue),
        totalCommission: Math.round(totalCommission),
        history,
      } satisfies Afiliada
    }))

    setAfiliadas(enriched)
    setLoading(false)
  }

  // Derived stats — "paid" means the affiliate was marked paid this month (no explicit payment tracking yet; use commissionMonth === 0 as heuristic)
  const pendingCount = afiliadas.filter(a => a.commissionMonth > 0).length
  const totalSalesMonth = afiliadas.reduce((s, a) => s + a.salesMonth, 0)
  const totalRevenueMonth = afiliadas.reduce((s, a) => s + a.revenueMonth, 0)
  const totalPending = afiliadas.reduce((s, a) => s + a.commissionMonth, 0)

  const filtered = tab === 'todas'
    ? afiliadas
    : tab === 'apagar'
      ? afiliadas.filter(a => a.commissionMonth > 0)
      : afiliadas.filter(a => a.commissionMonth === 0)

  const openEdit = (a: Afiliada) => {
    setEditing(a)
    setDraft({ ...a })
    setInviteState('idle')
    setInviteError(null)
    setSaveError(null)
  }

  const closeEdit = () => {
    setEditing(null)
    setDraft(null)
    setInviteState('idle')
    setInviteError(null)
    setSaveError(null)
  }

  const handleInvite = async () => {
    if (!draft?.email) return
    setInviteState('loading')
    setInviteError(null)
    const result = await invitePartnerUser(draft.email)
    if (result.ok) {
      setInviteState('sent')
    } else {
      setInviteState('error')
      setInviteError(result.error ?? 'Erro desconhecido')
    }
  }

  const saveEdit = async () => {
    if (!draft) return
    setSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from('partners')
      .update({
        contact_name: draft.name,
        email: draft.email,
        phone: draft.phone,
        commission_pct: draft.commissionPct,
        payment_day: draft.paymentDay,
        coupon_id: draft.couponId || null,
        is_active: draft.isActive,
      })
      .eq('id', draft.id)

    if (error) {
      setSaveError('Erro ao salvar. Tente novamente.')
      setSaving(false)
      return
    }

    setSaving(false)
    closeEdit()
    loadAfiliadas()
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div><h2 className="page-title">Afiliadas</h2></div>
        </div>
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Carregando…
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Afiliadas</h2>
          <p className="page-sub">{afiliadas.length} cadastradas · {pendingCount} com comissão a pagar este mês</p>
        </div>
        <div className="page-actions">
          <button className="btn primary" id="btn-nova-afiliada" data-testid="btn-nova-afiliada" disabled title="Cadastre no Supabase Auth e adicione em parceiros">
            <AdminIcon name="plus" /> Nova afiliada
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: '#c97d60' }} />Afiliadas ativas</div>
          <div className="kpi-value">{afiliadas.filter(a => a.isActive).length}</div>
          <div className="kpi-trend"><span className="subtle">total ativas</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: '#7c3aed' }} />Vendas no mês</div>
          <div className="kpi-value">{totalSalesMonth}</div>
          <div className="kpi-trend"><span className="subtle">via cupons de afiliadas</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: '#2563eb' }} />Receita gerada</div>
          <div className="kpi-value"><span className="unit">R$</span>{totalRevenueMonth.toLocaleString('pt-BR')}</div>
          <div className="kpi-trend"><span className="subtle">este mês</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: '#d97706' }} />A pagar</div>
          <div className="kpi-value"><span className="unit">R$</span>{totalPending.toLocaleString('pt-BR')}</div>
          <div className="kpi-trend"><span className="subtle">{pendingCount} afiliadas pendentes</span></div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'todas' ? 'active' : ''}`} onClick={() => setTab('todas')}>
          Todas <span className="count">{afiliadas.length}</span>
        </button>
        <button className={`tab ${tab === 'apagar' ? 'active' : ''}`} onClick={() => setTab('apagar')}>
          A pagar <span className="count">{pendingCount}</span>
        </button>
        <button className={`tab ${tab === 'pagas' ? 'active' : ''}`} onClick={() => setTab('pagas')}>
          Sem comissão <span className="count">{afiliadas.length - pendingCount}</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <span style={{ flex: 1 }} />
          <span className="cust-meta">Ordenar por: <b style={{ color: 'var(--text)' }}>Maior receita</b></span>
        </div>
        <div className="card-body flush">
          {afiliadas.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              Nenhuma afiliada cadastrada ainda. Adicione parceiros no Supabase com type = &apos;affiliate&apos;.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Afiliada</th>
                    <th style={{ width: 150 }}>Cupom</th>
                    <th style={{ width: 90 }}>Comissão</th>
                    <th style={{ width: 100 }}>Vendas/mês</th>
                    <th style={{ width: 145 }}>Receita/mês</th>
                    <th style={{ width: 145 }}>A pagar</th>
                    <th style={{ width: 80 }}>Status</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <Fragment key={a.id}>
                      <tr style={{ background: expanded === a.id ? 'var(--surface-2)' : undefined }}>
                        <td>
                          <button
                            className="icon-btn"
                            onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                            title="Ver histórico"
                            data-testid={`btn-expand-${a.id}`}
                          >
                            <AdminIcon name={expanded === a.id ? 'chevUp' : 'chevDown'} size={14} />
                          </button>
                        </td>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, #f0c8b0, #c97d60)',
                              color: '#fff', fontSize: 10, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {a.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{a.name}</div>
                              <div className="cust-meta tiny">{a.email || a.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {a.coupon !== '—' ? (
                            <span style={{
                              fontFamily: 'ui-monospace, monospace',
                              fontSize: 11.5,
                              background: 'var(--surface-2)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              letterSpacing: '0.04em',
                              fontWeight: 600,
                            }}>
                              {a.coupon}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Não vinculado</span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                            color: 'var(--accent)',
                            padding: '2px 9px',
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}>
                            {a.commissionPct}%
                          </span>
                        </td>
                        <td className="num">{a.salesMonth}</td>
                        <td className="num" style={{ fontWeight: 500 }}>{a.revenueMonth > 0 ? fmt(a.revenueMonth) : '—'}</td>
                        <td className="num" style={{ fontWeight: 600, color: a.commissionMonth > 0 ? 'var(--text)' : 'var(--text-3)' }}>
                          {a.commissionMonth > 0 ? fmt(a.commissionMonth) : '—'}
                        </td>
                        <td>
                          <span style={{
                            background: a.isActive ? '#dcfce7' : '#f3f4f6',
                            color: a.isActive ? '#15803d' : '#6b7280',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 500,
                          }}>
                            {a.isActive ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(a)}
                            title="Editar afiliada"
                            data-testid={`btn-edit-afiliada-${a.id}`}
                          >
                            <AdminIcon name="edit" size={14} />
                          </button>
                        </td>
                      </tr>

                      {expanded === a.id && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, background: 'var(--surface-2)' }}>
                            <div style={{ padding: '2px 20px 16px 56px' }}>
                              <div style={{
                                fontSize: 10.5, fontWeight: 500, color: 'var(--text-3)',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                padding: '10px 0 8px'
                              }}>
                                Histórico · desde {a.joinedDate} · {a.totalSales} vendas · {fmt(a.totalRevenue)} receita acumulada
                              </div>
                              {a.history.length === 0 ? (
                                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 8px' }}>
                                  {a.coupon === '—'
                                    ? 'Nenhum cupom vinculado — vincule um cupom para ver o histórico.'
                                    : 'Nenhuma venda registrada ainda.'}
                                </p>
                              ) : (
                                <table className="tbl" style={{
                                  background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', fontSize: 12.5,
                                }}>
                                  <thead>
                                    <tr>
                                      <th>Mês</th>
                                      <th style={{ width: 90 }}>Vendas</th>
                                      <th style={{ width: 155 }}>Receita</th>
                                      <th style={{ width: 155 }}>Comissão</th>
                                      <th style={{ width: 110 }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {a.history.map((h, j) => (
                                      <tr key={j}>
                                        <td style={{ fontWeight: j === 0 ? 500 : 400 }}>{h.month}</td>
                                        <td className="num">{h.sales}</td>
                                        <td className="num">{fmt(h.revenue)}</td>
                                        <td className="num" style={{ fontWeight: 500 }}>{fmt(h.commission)}</td>
                                        <td>
                                          <span style={{
                                            background: h.paid ? '#dcfce7' : '#fef3c7',
                                            color: h.paid ? '#15803d' : '#92400e',
                                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                                          }}>
                                            {h.paid ? 'Pago' : 'Pendente'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr style={{ borderTop: '1px solid var(--border)' }}>
                                      <td style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: 11 }}>Total acumulado</td>
                                      <td className="num" style={{ fontWeight: 600 }}>{a.totalSales}</td>
                                      <td className="num" style={{ fontWeight: 600 }}>{fmt(a.totalRevenue)}</td>
                                      <td className="num" style={{ fontWeight: 600 }}>{fmt(a.totalCommission)}</td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Drawer de edição */}
      <div className={`drawer-backdrop ${editing ? 'open' : ''}`} onClick={closeEdit} />
      <div className={`drawer ${editing ? 'open' : ''}`} data-testid="drawer-editar-afiliada">
        {draft && (
          <>
            <div className="drawer-header">
              <div>
                <h3>{draft.name}</h3>
                <div className="cust-meta">Afiliada · desde {draft.joinedDate}</div>
              </div>
              <button className="icon-btn" onClick={closeEdit}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="drawer-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Total em vendas</div>
                  <div className="kpi-value" style={{ fontSize: 20 }}>{draft.totalSales}</div>
                </div>
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Comissão acumulada</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{fmt(draft.totalCommission)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="field">
                  <label>Nome</label>
                  <input
                    className="input"
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    id="input-afiliada-nome"
                  />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input
                    className="input"
                    type="email"
                    value={draft.email}
                    onChange={e => setDraft({ ...draft, email: e.target.value })}
                    id="input-afiliada-email"
                  />
                </div>
                <div className="field">
                  <label>Telefone / WhatsApp</label>
                  <input
                    className="input"
                    value={draft.phone}
                    onChange={e => setDraft({ ...draft, phone: e.target.value })}
                    id="input-afiliada-telefone"
                  />
                </div>
                <div className="field">
                  <label>Cupom de desconto</label>
                  <select
                    className="input"
                    value={draft.couponId ?? ''}
                    onChange={e => {
                      const coupon = coupons.find(c => c.id === e.target.value)
                      setDraft({ ...draft, couponId: e.target.value || null, coupon: coupon?.code ?? '—' })
                    }}
                    id="input-afiliada-cupom"
                  >
                    <option value="">— Nenhum cupom —</option>
                    {coupons.map(c => (
                      <option key={c.id} value={c.id}>{c.code}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Comissão (%)</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={50}
                      value={draft.commissionPct}
                      onChange={e => setDraft({ ...draft, commissionPct: Number(e.target.value) })}
                      id="input-afiliada-comissao"
                    />
                  </div>
                  <div className="field">
                    <label>Dia de pagamento</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={28}
                      value={draft.paymentDay ?? 10}
                      onChange={e => setDraft({ ...draft, paymentDay: Number(e.target.value) })}
                      id="input-afiliada-dia-pgto"
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    className="input"
                    value={draft.isActive ? 'ativa' : 'inativa'}
                    onChange={e => setDraft({ ...draft, isActive: e.target.value === 'ativa' })}
                    id="input-afiliada-status"
                  >
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="drawer-footer" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
              {saveError && (
                <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{saveError}</p>
              )}
              {inviteState === 'error' && inviteError && (
                <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>
                  Erro ao enviar convite: {inviteError}
                </p>
              )}
              {inviteState === 'sent' && (
                <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>
                  Convite enviado para {draft.email}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" onClick={closeEdit}>Fechar</button>
                <button
                  className="btn"
                  onClick={handleInvite}
                  disabled={inviteState === 'loading' || inviteState === 'sent' || !draft.email}
                  id="btn-convidar-afiliada"
                  data-testid="btn-convidar-afiliada"
                  style={{ flex: 1 }}
                >
                  {inviteState === 'loading' ? 'Enviando...' : inviteState === 'sent' ? 'Convite enviado' : 'Convidar'}
                </button>
                <button
                  className="btn primary"
                  onClick={saveEdit}
                  disabled={saving}
                  id="btn-salvar-afiliada"
                  data-testid="btn-salvar-afiliada"
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
