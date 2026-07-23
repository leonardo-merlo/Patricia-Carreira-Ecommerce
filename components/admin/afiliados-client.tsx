"use client" // filtros, drawer de edição/criação e transições de ações server

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import { toCsv, downloadCsv } from '@/lib/csv'
import {
  invitePartnerUser,
  createAffiliatePartner,
  updateAffiliatePartner,
  setAffiliatePaymentStatus,
  type AffiliateFormInput,
} from '@/lib/actions/partners'
import type { AffiliateRow } from '@/lib/supabase/admin-queries'

interface AfiliadosClientProps {
  initialData: AffiliateRow[]
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const EMPTY_FORM: AffiliateFormInput = { name: '', email: '', phone: '', couponCode: '', commissionPct: 10 }

const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

export function AfiliadosClient({ initialData }: AfiliadosClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [tab, setTab] = useState<'todas' | 'apagar' | 'pagas'>('todas')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const [editing, setEditing] = useState<AffiliateRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<AffiliateFormInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const afiliadas = initialData
  const pendingCount = afiliadas.filter((a) => !a.paidMonth).length
  const paidCount = afiliadas.filter((a) => a.paidMonth).length
  const totalSalesMonth = afiliadas.reduce((s, a) => s + a.salesMonth, 0)
  const totalRevenueMonth = afiliadas.reduce((s, a) => s + a.revenueMonth, 0)
  const totalPending = afiliadas.filter((a) => !a.paidMonth).reduce((s, a) => s + a.commissionMonth, 0)

  const filtered = afiliadas
    .filter((a) => (tab === 'todas' ? true : tab === 'apagar' ? !a.paidMonth : a.paidMonth))
    .filter((a) => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return a.name.toLowerCase().includes(q) || (a.couponCode ?? '').toLowerCase().includes(q)
    })

  function togglePaid(a: AffiliateRow) {
    startTransition(async () => {
      await setAffiliatePaymentStatus(a.id, currentMonthKey, !a.paidMonth)
      router.refresh()
    })
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setCreating(true)
  }

  function openEdit(a: AffiliateRow) {
    setEditing(a)
    setForm({ name: a.name, email: a.email ?? '', phone: a.phone ?? '', couponCode: a.couponCode ?? '', commissionPct: a.commissionPct })
    setInviteState('idle')
    setInviteError(null)
    setFormError(null)
  }

  function closeDrawer() {
    setEditing(null)
    setCreating(false)
    setFormError(null)
    setInviteState('idle')
    setInviteError(null)
  }

  function handleInvite() {
    if (!form.email.trim()) return
    setInviteState('loading')
    setInviteError(null)
    startTransition(async () => {
      const result = await invitePartnerUser(form.email)
      if (result.ok) {
        setInviteState('sent')
      } else {
        setInviteState('error')
        setInviteError(result.error ?? 'Erro desconhecido')
      }
    })
  }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.')
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = editing
        ? await updateAffiliatePartner(editing.id, form)
        : await createAffiliatePartner(form)
      if (!res.success) {
        setFormError(res.error)
        return
      }
      router.refresh()
      closeDrawer()
    })
  }

  function exportCsv() {
    const headers = ['Nome', 'E-mail', 'Telefone', 'Cupom', 'Comissão (%)', 'Vendas/mês', 'Receita/mês (R$)', 'A pagar (R$)', 'Status', 'Desde']
    const rows = filtered.map((a) => [
      a.name, a.email ?? '', a.phone ?? '', a.couponCode ?? '', a.commissionPct,
      a.salesMonth, a.revenueMonth.toFixed(2).replace('.', ','), a.commissionMonth.toFixed(2).replace('.', ','),
      a.paidMonth ? 'Pago' : 'Pendente', a.joinedDate,
    ])
    downloadCsv(`afiliadas-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))
  }

  const draft = editing

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Afiliadas</h2>
          <p className="page-sub">{afiliadas.length} ativas · {pendingCount} com pagamento pendente este mês</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportCsv}><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-nova-afiliada" data-testid="btn-nova-afiliada" onClick={openCreate}>
            <AdminIcon name="plus" /> Nova afiliada
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: '#c97d60' }} />Afiliadas ativas</div>
          <div className="kpi-value">{afiliadas.length}</div>
          <div className="kpi-trend"><span className="subtle">total cadastradas</span></div>
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
          Pagas <span className="count">{paidCount}</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="search-input" style={{ width: 280 }}>
            <AdminIcon name="search" size={13} />
            <input placeholder="Buscar por nome ou cupom..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="card-body flush">
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
                  <th style={{ width: 145 }}>Valor a pagar</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                      Nenhuma afiliada encontrada.
                    </td>
                  </tr>
                )}
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
                            {a.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{a.name}</div>
                            <div className="cust-meta tiny">{a.phone ?? a.email ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'ui-monospace, monospace', fontSize: 11.5, background: 'var(--surface-2)',
                          padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)',
                          letterSpacing: '0.04em', fontWeight: 600,
                        }}>
                          {a.couponCode ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)',
                          padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                        }}>
                          {a.commissionPct}%
                        </span>
                      </td>
                      <td className="num">{a.salesMonth}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{fmt(a.revenueMonth)}</td>
                      <td className="num" style={{ fontWeight: 600, color: a.paidMonth ? 'var(--text-3)' : 'var(--text)' }}>
                        {fmt(a.commissionMonth)}
                      </td>
                      <td>
                        <button
                          data-testid={`btn-toggle-paid-${a.id}`}
                          disabled={isPending}
                          style={{
                            background: a.paidMonth ? '#dcfce7' : '#fef3c7',
                            color: a.paidMonth ? '#15803d' : '#92400e',
                            border: 'none', padding: '3px 10px 3px 8px', borderRadius: 20, fontSize: 11.5,
                            fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                          onClick={() => togglePaid(a)}
                          title="Clique para alternar status de pagamento"
                        >
                          {a.paidMonth ? <><AdminIcon name="check" size={10} />Pago</> : 'Pendente'}
                        </button>
                      </td>
                      <td>
                        <button className="icon-btn" onClick={() => openEdit(a)} title="Editar afiliada" data-testid={`btn-edit-afiliada-${a.id}`}>
                          <AdminIcon name="edit" size={14} />
                        </button>
                      </td>
                    </tr>

                    {expanded === a.id && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, background: 'var(--surface-2)' }}>
                          <div style={{ padding: '2px 20px 16px 56px' }}>
                            <div style={{
                              fontSize: 10.5, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase',
                              letterSpacing: '0.06em', padding: '10px 0 8px',
                            }}>
                              Histórico · desde {a.joinedDate} · {a.totalSales} vendas · {fmt(a.totalRevenue)} receita acumulada
                            </div>
                            {a.months.length === 0 ? (
                              <div className="cust-meta" style={{ fontSize: 12, padding: '4px 0 12px' }}>Nenhuma venda registrada com esse cupom ainda.</div>
                            ) : (
                              <table className="tbl" style={{ background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', fontSize: 12.5 }}>
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
                                  {a.months.map((h, j) => (
                                    <tr key={h.key}>
                                      <td style={{ fontWeight: j === 0 ? 500 : 400 }}>{h.label}</td>
                                      <td className="num">{h.sales}</td>
                                      <td className="num">{fmt(h.revenue)}</td>
                                      <td className="num" style={{ fontWeight: 500 }}>{fmt(h.commission)}</td>
                                      <td>
                                        <span style={{
                                          background: h.paid ? '#dcfce7' : '#fef3c7', color: h.paid ? '#15803d' : '#92400e',
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
        </div>
      </div>

      <div className={`drawer-backdrop ${editing || creating ? 'open' : ''}`} onClick={closeDrawer} />
      <div className={`drawer ${editing || creating ? 'open' : ''}`} data-testid="drawer-editar-afiliada">
        {(editing || creating) && (
          <>
            <div className="drawer-header">
              <div>
                <h3>{editing ? editing.name : 'Nova afiliada'}</h3>
                <div className="cust-meta">{editing ? `Afiliada · desde ${editing.joinedDate}` : 'Cadastrar nova afiliada'}</div>
              </div>
              <button className="icon-btn" onClick={closeDrawer}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="drawer-body">
              {draft && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <div className="kpi" style={{ padding: 12 }}>
                    <div className="kpi-label">Total em vendas</div>
                    <div className="kpi-value" style={{ fontSize: 20 }}>{draft.totalSales}</div>
                  </div>
                  <div className="kpi" style={{ padding: 12 }}>
                    <div className="kpi-label">Comissão total</div>
                    <div className="kpi-value" style={{ fontSize: 18 }}>{fmt(draft.totalCommission)}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="field">
                  <label>Nome</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="input-afiliada-nome" />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} id="input-afiliada-email" />
                </div>
                <div className="field">
                  <label>Telefone / WhatsApp</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} id="input-afiliada-telefone" />
                </div>
                <div className="field">
                  <label>Cupom de desconto</label>
                  <input
                    className="input"
                    value={form.couponCode}
                    onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                    id="input-afiliada-cupom"
                    style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}
                  />
                </div>
                <div className="field">
                  <label>Comissão (%)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={50}
                    value={form.commissionPct}
                    onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })}
                    id="input-afiliada-comissao"
                  />
                </div>
              </div>
              {formError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{formError}</p>}
            </div>
            <div className="drawer-footer" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
              {editing && inviteState === 'error' && inviteError && (
                <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>Erro ao enviar convite: {inviteError}</p>
              )}
              {editing && inviteState === 'sent' && (
                <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>Convite enviado para {form.email}</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" onClick={closeDrawer}>Fechar</button>
                {editing && (
                  <button
                    className="btn"
                    onClick={handleInvite}
                    disabled={inviteState === 'loading' || inviteState === 'sent' || !form.email || isPending}
                    id="btn-convidar-afiliada"
                    data-testid="btn-convidar-afiliada"
                    style={{ flex: 1 }}
                  >
                    {inviteState === 'loading' ? 'Enviando...' : inviteState === 'sent' ? 'Convite enviado' : 'Convidar'}
                  </button>
                )}
                <button className="btn primary" onClick={handleSave} disabled={isPending} id="btn-salvar-afiliada" data-testid="btn-salvar-afiliada">
                  {isPending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
