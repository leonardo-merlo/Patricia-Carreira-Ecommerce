"use client" // tabs, search, sort, filter, drawer, modal state

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import { toCsv, downloadCsv } from '@/lib/csv'
import type { CustomerRow } from '@/lib/supabase/customer-queries'
import { updateCustomer, createCustomer } from '@/lib/actions/customers'

type Tab = 'todos' | 'varejo' | 'atacado'
type SortKey = 'revenue' | 'name' | 'orders' | 'last_order'

const ORDER_STATUS: Record<string, { cls: string; txt: string }> = {
  pending:    { cls: 'pendente',  txt: 'Pendente'  },
  paid:       { cls: 'pago',      txt: 'Pago'      },
  separating: { cls: 'pendente',  txt: 'Separando' },
  shipped:    { cls: 'enviado',   txt: 'Enviado'   },
  delivered:  { cls: 'pago',      txt: 'Entregue'  },
  cancelled:  { cls: 'cancelado', txt: 'Cancelado' },
}

function fmtFull(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function fmtShort(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function cityLabel(c: CustomerRow): string {
  if (!c.address?.city) return '—'
  return c.address.state ? `${c.address.city}/${c.address.state}` : c.address.city
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function exportCSV(rows: CustomerRow[]): void {
  const headers = ['Nome', 'Tipo', 'Email', 'Telefone', 'CPF/CNPJ', 'Instagram', 'Cidade', 'UF', 'Pedidos', 'Total comprado (R$)', 'Último pedido']
  const data = rows.map((c) => [
    c.name,
    c.type === 'wholesale' ? 'Atacado' : 'Varejo',
    c.email ?? '',
    c.phone ?? '',
    c.cpf_cnpj ?? '',
    c.instagram ? `@${c.instagram}` : '',
    c.address?.city ?? '',
    c.address?.state ?? '',
    c.order_count,
    c.total_spent.toFixed(2).replace('.', ','),
    fmtFull(c.last_order_at),
  ])
  const csv = toCsv(headers, data)
  downloadCsv(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}

type EditForm = {
  name: string
  email: string
  phone: string
  cpf_cnpj: string
  instagram: string
  type: 'retail' | 'wholesale'
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zip: string
}

type NewForm = {
  name: string
  email: string
  phone: string
  cpf_cnpj: string
  instagram: string
  type: 'retail' | 'wholesale'
}

function toEditForm(c: CustomerRow): EditForm {
  return {
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    cpf_cnpj: c.cpf_cnpj ?? '',
    instagram: c.instagram ?? '',
    type: c.type,
    street: c.address?.street ?? '',
    number: c.address?.number ?? '',
    complement: c.address?.complement ?? '',
    neighborhood: c.address?.neighborhood ?? '',
    city: c.address?.city ?? '',
    state: c.address?.state ?? '',
    zip: c.address?.zip ?? '',
  }
}

interface ClientesClientProps {
  initialData: CustomerRow[]
}

export function ClientesClient({ initialData }: ClientesClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [tab, setTab]               = useState<Tab>('todos')
  const [search, setSearch]         = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sort, setSort]             = useState<SortKey>('revenue')
  const [selected, setSelected]     = useState<CustomerRow | null>(null)
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('view')
  const [showNew, setShowNew]       = useState(false)
  const [editForm, setEditForm]     = useState<EditForm | null>(null)
  const [newForm, setNewForm]       = useState<NewForm>({ name: '', email: '', phone: '', cpf_cnpj: '', instagram: '', type: 'retail' })
  const [saveError, setSaveError]   = useState<string | null>(null)

  const cities = useMemo(() => {
    const set = new Set<string>()
    for (const c of initialData) {
      const loc = cityLabel(c)
      if (loc !== '—') set.add(loc)
    }
    return Array.from(set).sort()
  }, [initialData])

  const filtered = useMemo(() => {
    let rows = initialData
    if (tab !== 'todos') {
      rows = rows.filter((c) => (tab === 'atacado' ? c.type === 'wholesale' : c.type === 'retail'))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? '').includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          cityLabel(c).toLowerCase().includes(q),
      )
    }
    if (cityFilter) {
      rows = rows.filter((c) => cityLabel(c) === cityFilter)
    }
    const s = [...rows]
    switch (sort) {
      case 'revenue':    s.sort((a, b) => b.total_spent - a.total_spent);  break
      case 'name':       s.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')); break
      case 'orders':     s.sort((a, b) => b.order_count - a.order_count);  break
      case 'last_order': s.sort((a, b) => {
        if (!a.last_order_at && !b.last_order_at) return 0
        if (!a.last_order_at) return 1
        if (!b.last_order_at) return -1
        return b.last_order_at.localeCompare(a.last_order_at)
      }); break
    }
    return s
  }, [initialData, tab, search, cityFilter, sort])

  const counts = {
    todos:   initialData.length,
    varejo:  initialData.filter((c) => c.type === 'retail').length,
    atacado: initialData.filter((c) => c.type === 'wholesale').length,
  }

  function openView(c: CustomerRow) {
    setSelected(c)
    setDrawerMode('view')
    setEditForm(null)
    setSaveError(null)
  }

  function openEdit(c: CustomerRow) {
    setSelected(c)
    setDrawerMode('edit')
    setEditForm(toEditForm(c))
    setSaveError(null)
  }

  function closeDrawer() {
    setSelected(null)
    setEditForm(null)
    setSaveError(null)
  }

  function handleSave() {
    if (!selected || !editForm || isPending) return
    setSaveError(null)
    startTransition(async () => {
      const hasAddress = editForm.zip || editForm.city || editForm.street
      const address = hasAddress
        ? {
            street:       editForm.street       || undefined,
            number:       editForm.number       || undefined,
            complement:   editForm.complement   || null,
            neighborhood: editForm.neighborhood || undefined,
            city:         editForm.city         || undefined,
            state:        editForm.state        || undefined,
            zip:          editForm.zip          || undefined,
          }
        : null
      const result = await updateCustomer(selected.id, {
        name:      editForm.name,
        email:     editForm.email    || null,
        phone:     editForm.phone    || null,
        cpf_cnpj:  editForm.cpf_cnpj || null,
        instagram: editForm.instagram.trim().replace(/^@/, '') || null,
        type:      editForm.type,
        address,
      })
      if (result.error) {
        setSaveError(result.error)
      } else {
        closeDrawer()
        router.refresh()
      }
    })
  }

  function handleCreate() {
    if (!newForm.name.trim() || isPending) return
    setSaveError(null)
    startTransition(async () => {
      const result = await createCustomer({
        name:      newForm.name,
        email:     newForm.email    || null,
        phone:     newForm.phone    || null,
        cpf_cnpj:  newForm.cpf_cnpj || null,
        instagram: newForm.instagram.trim().replace(/^@/, '') || null,
        type:      newForm.type,
      })
      if (result.error) {
        setSaveError(result.error)
      } else {
        setShowNew(false)
        setNewForm({ name: '', email: '', phone: '', cpf_cnpj: '', instagram: '', type: 'retail' })
        router.refresh()
      }
    })
  }

  function ef(key: keyof EditForm, value: string) {
    setEditForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  const sinceYear = (iso: string) => new Date(iso).getFullYear()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Clientes</h2>
          <p className="page-sub">
            {initialData.length} cadastrados · {counts.atacado} atacadistas · {counts.varejo} varejo
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => exportCSV(filtered)}>
            <AdminIcon name="download" /> Exportar
          </button>
          <button className="btn primary" id="btn-novo-cliente" onClick={() => { setShowNew(true); setSaveError(null) }}>
            <AdminIcon name="plus" /> Novo cliente
          </button>
        </div>
      </div>

      <div className="tabs">
        {(['todos', 'varejo', 'atacado'] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}{' '}
            <span className="count">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="row" style={{ flex: 1, gap: 8 }}>
            <div className="search-input" style={{ width: 280 }}>
              <AdminIcon name="search" size={13} />
              <input
                placeholder="Buscar por nome, telefone, cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="">Todas as cidades</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Ordenar por:</span>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="revenue">Maior receita</option>
              <option value="orders">Mais pedidos</option>
              <option value="name">Nome (A–Z)</option>
              <option value="last_order">Último pedido</option>
            </select>
          </div>
        </div>

        <div className="card-body flush">
          <div className="table-wrap">
            {filtered.length === 0 ? (
              <div className="empty">
                <div className="ill"><AdminIcon name="users" size={32} /></div>
                <h4>Nenhum cliente encontrado</h4>
                <p>Tente ajustar os filtros ou cadastre um novo cliente.</p>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th style={{ width: 90 }}>Tipo</th>
                    <th>Contato</th>
                    <th style={{ width: 150 }}>Cidade/UF</th>
                    <th style={{ width: 80 }}>Pedidos</th>
                    <th style={{ width: 140 }}>Total comprado</th>
                    <th style={{ width: 120 }}>Último pedido</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <div
                            className="thumb"
                            style={{
                              width: 26, height: 26, fontSize: 10,
                              background: c.type === 'wholesale'
                                ? 'linear-gradient(135deg,#d8c89a,#a08956)'
                                : 'linear-gradient(135deg,#c4b98f,#8a7f4a)',
                              color: '#fff',
                            }}
                          >
                            {initials(c.name)}
                          </div>
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${c.type === 'wholesale' ? 'atacado' : 'varejo'}`}>
                          {c.type === 'wholesale' ? 'Atacado' : 'Varejo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5 }}>{c.phone ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</div>
                        {c.email && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.email}</div>}
                      </td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{cityLabel(c)}</td>
                      <td className="num">{c.order_count}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{formatPrice(c.total_spent)}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{fmtShort(c.last_order_at)}</td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                          <button className="btn sm ghost" onClick={() => openView(c)}>
                            <AdminIcon name="eye" size={11} /> Ver
                          </button>
                          <button className="icon-btn" title="Editar" onClick={() => openEdit(c)}>
                            <AdminIcon name="edit" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Drawer ── */}
      <div className={`drawer-backdrop ${selected ? 'open' : ''}`} onClick={closeDrawer} />
      <div className={`drawer ${selected ? 'open' : ''}`}>
        {selected && (
          <>
            <div className="drawer-header">
              <div>
                <h3>{selected.name}</h3>
                <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 2 }}>
                  {selected.type === 'wholesale' ? 'Cliente atacado' : 'Cliente varejo'} · desde {sinceYear(selected.created_at)}
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                {drawerMode === 'view' && (
                  <button className="btn sm ghost" onClick={() => openEdit(selected)}>
                    <AdminIcon name="edit" size={12} /> Editar
                  </button>
                )}
                <button className="icon-btn" onClick={closeDrawer}><AdminIcon name="x" size={14} /></button>
              </div>
            </div>

            <div className="drawer-body">
              {drawerMode === 'view' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                    <div className="kpi" style={{ padding: 12 }}>
                      <div className="kpi-label">Total comprado</div>
                      <div className="kpi-value" style={{ fontSize: 20 }}>{formatPrice(selected.total_spent)}</div>
                    </div>
                    <div className="kpi" style={{ padding: 12 }}>
                      <div className="kpi-label">Pedidos</div>
                      <div className="kpi-value" style={{ fontSize: 20 }}>{selected.order_count}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                    {selected.phone && (
                      <div className="row" style={{ gap: 8, fontSize: 12.5 }}>
                        <AdminIcon name="plug" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <span>{selected.phone}</span>
                      </div>
                    )}
                    {selected.email && (
                      <div className="row" style={{ gap: 8, fontSize: 12.5 }}>
                        <AdminIcon name="mail" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <span>{selected.email}</span>
                      </div>
                    )}
                    {selected.cpf_cnpj && (
                      <div className="row" style={{ gap: 8, fontSize: 12.5 }}>
                        <AdminIcon name="fileText" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <span>{selected.cpf_cnpj}</span>
                      </div>
                    )}
                    {selected.instagram && (
                      <div className="row" style={{ gap: 8, fontSize: 12.5 }}>
                        <AdminIcon name="instagram" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <a
                          href={`https://instagram.com/${selected.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          @{selected.instagram}
                        </a>
                      </div>
                    )}
                    {selected.address?.city && (
                      <div className="row" style={{ gap: 8, fontSize: 12.5 }}>
                        <AdminIcon name="mapPin" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <span>
                          {[selected.address.street, selected.address.number].filter(Boolean).join(', ')}
                          {selected.address.neighborhood && ` · ${selected.address.neighborhood}`}
                          {` · ${cityLabel(selected)}`}
                          {selected.address.zip && ` · ${selected.address.zip}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {selected.recent_orders.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, color: 'var(--text-3)', marginBottom: 8 }}>
                        Últimos pedidos
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {selected.recent_orders.map((o, i) => {
                          const st = ORDER_STATUS[o.status] ?? { cls: 'neutral', txt: o.status }
                          return (
                            <div key={i} className="row between" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12.5 }}>
                              <div className="row" style={{ gap: 8 }}>
                                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'var(--text-2)' }}>{o.num}</span>
                                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{o.date}</span>
                              </div>
                              <div className="row" style={{ gap: 8 }}>
                                <span style={{ fontWeight: 500 }}>{formatPrice(o.total)}</span>
                                <span className={`badge ${st.cls}`}>{st.txt}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                editForm && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="field">
                      <label>Nome *</label>
                      <input className="input" value={editForm.name} onChange={(e) => ef('name', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Tipo de cliente</label>
                      <div className="tag-toggle">
                        <button className={editForm.type === 'retail' ? 'active' : ''} onClick={() => ef('type', 'retail')}>Varejo</button>
                        <button className={editForm.type === 'wholesale' ? 'active' : ''} onClick={() => ef('type', 'wholesale')}>Atacado</button>
                      </div>
                    </div>
                    <div className="field">
                      <label>E-mail</label>
                      <input className="input" type="email" value={editForm.email} onChange={(e) => ef('email', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Telefone</label>
                      <input className="input" value={editForm.phone} onChange={(e) => ef('phone', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>CPF / CNPJ</label>
                      <input className="input" value={editForm.cpf_cnpj} onChange={(e) => ef('cpf_cnpj', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Instagram</label>
                      <input className="input" placeholder="@usuario" value={editForm.instagram} onChange={(e) => ef('instagram', e.target.value)} />
                    </div>
                    <div className="divider" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="field" style={{ gridColumn: '1/-1' }}>
                        <label>CEP</label>
                        <input className="input" value={editForm.zip} onChange={(e) => ef('zip', e.target.value)} style={{ width: 140 }} />
                      </div>
                      <div className="field" style={{ gridColumn: '1/-1' }}>
                        <label>Rua / Logradouro</label>
                        <input className="input" value={editForm.street} onChange={(e) => ef('street', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Número</label>
                        <input className="input" value={editForm.number} onChange={(e) => ef('number', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Complemento</label>
                        <input className="input" value={editForm.complement} onChange={(e) => ef('complement', e.target.value)} />
                      </div>
                      <div className="field" style={{ gridColumn: '1/-1' }}>
                        <label>Bairro</label>
                        <input className="input" value={editForm.neighborhood} onChange={(e) => ef('neighborhood', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Cidade</label>
                        <input className="input" value={editForm.city} onChange={(e) => ef('city', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>UF</label>
                        <input className="input" value={editForm.state} maxLength={2} onChange={(e) => ef('state', e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }} />
                      </div>
                    </div>
                    {saveError && (
                      <div style={{ color: 'var(--red)', fontSize: 12, padding: '8px 12px', background: 'var(--red-soft)', borderRadius: 6 }}>
                        {saveError}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            <div className="drawer-footer">
              <button className="btn ghost" onClick={closeDrawer}>Fechar</button>
              {drawerMode === 'edit' && (
                <button className="btn primary" onClick={handleSave} disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Salvar'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Novo cliente modal ── */}
      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Novo cliente</h3>
                <div className="sub">Preencha os dados básicos. Endereço pode ser adicionado depois.</div>
              </div>
              <button className="icon-btn" onClick={() => setShowNew(false)}><AdminIcon name="x" size={14} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <div className="field">
                <label>Tipo de cliente</label>
                <div className="tag-toggle">
                  <button className={newForm.type === 'retail' ? 'active' : ''} onClick={() => setNewForm((f) => ({ ...f, type: 'retail' }))}>Varejo</button>
                  <button className={newForm.type === 'wholesale' ? 'active' : ''} onClick={() => setNewForm((f) => ({ ...f, type: 'wholesale' }))}>Atacado</button>
                </div>
              </div>
              <div className="field">
                <label>Nome *</label>
                <input className="input" placeholder="Nome completo ou razão social" value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Telefone</label>
                  <input className="input" placeholder="(00) 9 0000-0000" value={newForm.phone} onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input className="input" type="email" placeholder="email@exemplo.com" value={newForm.email} onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>{newForm.type === 'wholesale' ? 'CNPJ' : 'CPF'}</label>
                  <input className="input" placeholder={newForm.type === 'wholesale' ? '00.000.000/0001-00' : '000.000.000-00'} value={newForm.cpf_cnpj} onChange={(e) => setNewForm((f) => ({ ...f, cpf_cnpj: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Instagram</label>
                  <input className="input" placeholder="@usuario" value={newForm.instagram} onChange={(e) => setNewForm((f) => ({ ...f, instagram: e.target.value }))} />
                </div>
              </div>
              {saveError && (
                <div style={{ color: 'var(--red)', fontSize: 12, padding: '8px 12px', background: 'var(--red-soft)', borderRadius: 6 }}>
                  {saveError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleCreate} disabled={isPending || !newForm.name.trim()}>
                {isPending ? 'Salvando…' : 'Criar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
