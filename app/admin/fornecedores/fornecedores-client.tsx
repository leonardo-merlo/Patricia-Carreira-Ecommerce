"use client"
// needs useState, event handlers, and router refresh

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import {
  type Supplier,
  type SupplierFormData,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierMaterials,
} from '@/lib/actions/suppliers'

type DrawerMode = 'view' | 'new'

type LinkedMaterial = { id: string; name: string; unit: string }

function Stars({ rating }: { rating: number }) {
  return (
    <div className="row" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill={i <= rating ? 'var(--yellow)' : 'var(--border-strong)'}
        >
          <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8l-2.78 1.55.53-3.1L1.5 4.25l3.1-.45z" />
        </svg>
      ))}
    </div>
  )
}

function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="row" style={{ gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 12 12"
            fill={i <= value ? 'var(--yellow)' : 'var(--border-strong)'}
          >
            <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8l-2.78 1.55.53-3.1L1.5 4.25l3.1-.45z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function emptyForm(): SupplierFormData {
  return {
    name: '',
    cnpj: null,
    contact_name: null,
    phone: null,
    email: null,
    city: null,
    address: null,
    rating: 3,
    notes: null,
  }
}

export default function FornecedoresClient({
  initialSuppliers,
}: {
  initialSuppliers: Supplier[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')

  const [drawerMode, setDrawerMode] = useState<DrawerMode>('view')
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [viewMaterials, setViewMaterials] = useState<LinkedMaterial[]>([])

  const [form, setForm] = useState<SupplierFormData>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Unique cities/states for filter dropdown (derived from loaded data)
  const uniqueCities = Array.from(
    new Set(suppliers.map((s) => s.city).filter(Boolean)),
  ).sort() as string[]

  // Client-side filtering
  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.cnpj ?? '').toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q)
    const matchesState = !stateFilter || s.city === stateFilter
    return matchesSearch && matchesState
  })

  const totalMaterials = suppliers.reduce((acc, s) => acc + s.materials_count, 0)

  const openNew = () => {
    setSelected(null)
    setForm(emptyForm())
    setErrorMsg(null)
    setDrawerMode('new')
  }

  const openView = async (s: Supplier) => {
    setSelected(s)
    setForm({
      name: s.name,
      cnpj: s.cnpj,
      contact_name: s.contact_name,
      phone: s.phone,
      email: s.email,
      city: s.city,
      address: s.address,
      rating: s.rating,
      notes: s.notes,
    })
    setErrorMsg(null)
    setDrawerMode('view')

    // Load linked materials asynchronously
    const mats = await getSupplierMaterials(s.id)
    setViewMaterials(mats)
  }

  const closeDrawer = () => {
    setSelected(null)
    setViewMaterials([])
    setDrawerMode('view')
    setErrorMsg(null)
  }

  const drawerOpen = selected !== null || drawerMode === 'new'

  const handleCreate = async () => {
    setSaving(true)
    setErrorMsg(null)
    const result = await createSupplier(form)
    setSaving(false)
    if (!result.success) {
      setErrorMsg(result.error)
      return
    }
    closeDrawer()
    startTransition(() => router.refresh())
    // Optimistically re-fetch isn't needed — router.refresh will trigger a re-render
    // but we also update local state to avoid flash
    setSuppliers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...form,
        name: form.name,
        cnpj: form.cnpj,
        contact_name: form.contact_name,
        phone: form.phone,
        email: form.email,
        city: form.city,
        address: form.address,
        rating: form.rating,
        notes: form.notes,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        materials_count: 0,
      },
    ])
  }

  const handleUpdate = async () => {
    if (!selected) return
    setSaving(true)
    setErrorMsg(null)
    const result = await updateSupplier(selected.id, form)
    setSaving(false)
    if (!result.success) {
      setErrorMsg(result.error)
      return
    }
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === selected.id
          ? { ...s, ...form, updated_at: new Date().toISOString() }
          : s,
      ),
    )
    closeDrawer()
    startTransition(() => router.refresh())
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm(`Remover "${selected.name}"? Esta ação não pode ser desfeita.`)) return
    setSaving(true)
    const result = await deleteSupplier(selected.id)
    setSaving(false)
    if (!result.success) {
      setErrorMsg(result.error)
      return
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== selected.id))
    closeDrawer()
    startTransition(() => router.refresh())
  }

  const setField = <K extends keyof SupplierFormData>(
    key: K,
    value: SupplierFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Fornecedores</h2>
          <p className="page-sub">
            {suppliers.length} cadastrados · {totalMaterials} matérias-primas vinculadas
          </p>
        </div>
        <div className="page-actions">
          <button className="btn">
            <AdminIcon name="download" /> Exportar
          </button>
          <button
            className="btn primary"
            id="btn-novo-fornecedor"
            onClick={openNew}
          >
            <AdminIcon name="plus" /> Novo fornecedor
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="row" style={{ flex: 1, gap: 8 }}>
            <div className="search-input" style={{ width: 280 }}>
              <AdminIcon name="search" size={13} />
              <input
                placeholder="Buscar por nome, CNPJ, cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="">Todos os estados</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <span className="cust-meta">
            Ordenar por: <b style={{ color: 'var(--text)' }}>Nome</b>
          </span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th style={{ width: 150 }}>CNPJ</th>
                  <th>Matérias-primas</th>
                  <th style={{ width: 140 }}>Cidade/UF</th>
                  <th style={{ width: 90 }}>Avaliação</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ textAlign: 'center', color: 'var(--text-3)', padding: 24 }}
                    >
                      Nenhum fornecedor encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div
                          className="thumb"
                          style={{
                            width: 28,
                            height: 28,
                            fontSize: 11,
                            borderRadius: 6,
                            background: 'linear-gradient(135deg,#d8c89a,#a08956)',
                            color: '#fff',
                          }}
                        >
                          {s.name
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.name}</div>
                          <div className="cust-meta tiny">
                            {s.contact_name ?? '—'} · {s.phone ?? '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="cust-meta"
                      style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}
                    >
                      {s.cnpj ?? '—'}
                    </td>
                    <td>
                      <span className="chip">{s.materials_count} vinculada{s.materials_count !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="cust-meta">{s.city ?? '—'}</td>
                    <td>
                      <Stars rating={s.rating} />
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          className="btn sm ghost"
                          onClick={() => openView(s)}
                          id={`btn-ver-fornecedor-${i}`}
                        >
                          <AdminIcon name="eye" size={11} /> Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
      />

      {/* View Drawer */}
      <div
        className={`drawer ${drawerOpen && drawerMode === 'view' ? 'open' : ''}`}
        style={{ width: 520 }}
      >
        {selected && (
          <>
            <div className="drawer-header">
              <div>
                <h3>{selected.name}</h3>
                <div className="cust-meta">
                  {selected.city ?? '—'} · <Stars rating={selected.rating} />
                </div>
              </div>
              <button className="icon-btn" onClick={closeDrawer}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="drawer-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Materiais vinculados</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>
                    {selected.materials_count}
                  </div>
                </div>
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Avaliação</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>
                    {selected.rating}/5
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label>Nome</label>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>CNPJ</label>
                    <input
                      className="input"
                      value={form.cnpj ?? ''}
                      onChange={(e) => setField('cnpj', e.target.value || null)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label>Contato</label>
                    <input
                      className="input"
                      value={form.contact_name ?? ''}
                      onChange={(e) => setField('contact_name', e.target.value || null)}
                    />
                  </div>
                  <div className="field">
                    <label>Telefone</label>
                    <input
                      className="input"
                      value={form.phone ?? ''}
                      onChange={(e) => setField('phone', e.target.value || null)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input
                    className="input"
                    value={form.email ?? ''}
                    onChange={(e) => setField('email', e.target.value || null)}
                  />
                </div>
                <div className="field">
                  <label>Cidade / UF</label>
                  <input
                    className="input"
                    value={form.city ?? ''}
                    onChange={(e) => setField('city', e.target.value || null)}
                  />
                </div>
                <div className="field">
                  <label>Endereço</label>
                  <input
                    className="input"
                    value={form.address ?? ''}
                    onChange={(e) => setField('address', e.target.value || null)}
                  />
                </div>
                <div className="field">
                  <label>Avaliação</label>
                  <StarPicker
                    value={form.rating}
                    onChange={(v) => setField('rating', v)}
                  />
                </div>
                <div className="field">
                  <label>Observações</label>
                  <textarea
                    className="input"
                    rows={2}
                    style={{ height: 'auto', padding: 8, resize: 'vertical' }}
                    value={form.notes ?? ''}
                    onChange={(e) => setField('notes', e.target.value || null)}
                  />
                </div>
              </div>

              {viewMaterials.length > 0 && (
                <div>
                  <div
                    className="cust-meta"
                    style={{
                      textTransform: 'uppercase',
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      marginBottom: 8,
                    }}
                  >
                    Matérias-primas fornecidas
                  </div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {viewMaterials.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 10px',
                          background: 'var(--surface-2)',
                          borderRadius: 5,
                          fontSize: 12.5,
                        }}
                      >
                        <div className="thumb mat" style={{ width: 20, height: 20 }}>
                          <AdminIcon name="layers" size={10} />
                        </div>
                        {m.name}
                        <span className="cust-meta" style={{ marginLeft: 'auto' }}>
                          {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <p style={{ color: 'var(--red, #ef4444)', fontSize: 12.5, marginTop: 10 }}>
                  {errorMsg}
                </p>
              )}
            </div>
            <div className="drawer-footer">
              <button
                className="btn ghost"
                style={{ color: 'var(--red, #ef4444)' }}
                onClick={handleDelete}
                disabled={saving}
              >
                Remover
              </button>
              <button className="btn ghost" onClick={closeDrawer}>
                Fechar
              </button>
              <button
                className="btn primary"
                id="btn-salvar-fornecedor"
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* New Fornecedor Drawer */}
      <div
        className={`drawer ${drawerOpen && drawerMode === 'new' ? 'open' : ''}`}
        style={{ width: 560 }}
      >
        <div className="drawer-header">
          <div>
            <h3>Novo Fornecedor</h3>
            <div className="cust-meta">Preencha os dados do fornecedor</div>
          </div>
          <button className="icon-btn" onClick={closeDrawer}>
            <AdminIcon name="x" size={14} />
          </button>
        </div>
        <div className="drawer-body">
          <div style={{ marginBottom: 20 }}>
            <div
              className="cust-meta"
              style={{
                textTransform: 'uppercase',
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.05em',
                marginBottom: 12,
              }}
            >
              Dados cadastrais
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Razão social / Nome *</label>
                  <input
                    className="input"
                    placeholder="Ex.: Curtume Vargas"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                  <span className="cust-meta" style={{ fontSize: 11 }}>* campo obrigatório</span>
                </div>
                <div className="field">
                  <label>CNPJ</label>
                  <input
                    className="input"
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj ?? ''}
                    onChange={(e) => setField('cnpj', e.target.value || null)}
                  />
                </div>
              </div>
              <div className="field">
                <label>Cidade / UF</label>
                <input
                  className="input"
                  placeholder="Porto Alegre/RS"
                  value={form.city ?? ''}
                  onChange={(e) => setField('city', e.target.value || null)}
                />
              </div>
              <div className="field">
                <label>Endereço</label>
                <textarea
                  className="input"
                  rows={2}
                  style={{ height: 'auto', padding: 8, resize: 'vertical' }}
                  placeholder="Rua, número, bairro, CEP..."
                  value={form.address ?? ''}
                  onChange={(e) => setField('address', e.target.value || null)}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              className="cust-meta"
              style={{
                textTransform: 'uppercase',
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.05em',
                marginBottom: 12,
              }}
            >
              Contato
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Nome do contato</label>
                  <input
                    className="input"
                    placeholder="Ex.: Roberto Vargas"
                    value={form.contact_name ?? ''}
                    onChange={(e) => setField('contact_name', e.target.value || null)}
                  />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input
                    className="input"
                    placeholder="(51) 3322-8800"
                    value={form.phone ?? ''}
                    onChange={(e) => setField('phone', e.target.value || null)}
                  />
                </div>
              </div>
              <div className="field">
                <label>E-mail</label>
                <input
                  className="input"
                  placeholder="vendas@fornecedor.com.br"
                  value={form.email ?? ''}
                  onChange={(e) => setField('email', e.target.value || null)}
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label>Avaliação inicial</label>
            <StarPicker
              value={form.rating}
              onChange={(v) => setField('rating', v)}
            />
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Observações</label>
            <textarea
              className="input"
              rows={2}
              style={{ height: 'auto', padding: 8, resize: 'vertical' }}
              placeholder="Condições de pagamento, prazo de entrega..."
              value={form.notes ?? ''}
              onChange={(e) => setField('notes', e.target.value || null)}
            />
          </div>

          {errorMsg && (
            <p style={{ color: 'var(--red, #ef4444)', fontSize: 12.5, marginTop: 10 }}>
              {errorMsg}
            </p>
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn ghost" onClick={closeDrawer}>
            Cancelar
          </button>
          <button
            className="btn primary"
            id="btn-confirmar-fornecedor"
            onClick={handleCreate}
            disabled={saving || isPending}
          >
            <AdminIcon name="check" size={12} />
            {saving ? 'Salvando...' : 'Cadastrar fornecedor'}
          </button>
        </div>
      </div>
    </div>
  )
}
