"use client"

import { useState, useTransition } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import type { Coupon } from '@/lib/types'
import {
  createCoupon,
  updateCoupon,
  toggleCouponActive,
  deleteCoupon,
} from '@/lib/actions/coupons'

interface Props {
  initialCoupons: Coupon[]
}

type DraftCoupon = {
  code: string
  type: 'percent' | 'fixed'
  value: string
  description: string
  min_order_value: string
  max_uses: string
  max_uses_per_user: string
  valid_from: string
  valid_until: string
  is_active: boolean
}

const emptyDraft = (): DraftCoupon => ({
  code: '',
  type: 'percent',
  value: '',
  description: '',
  min_order_value: '0',
  max_uses: '',
  max_uses_per_user: '',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: '',
  is_active: true,
})

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function fmtValue(coupon: Coupon): string {
  if (coupon.type === 'percent') return `${coupon.value}%`
  return `R$ ${Number(coupon.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function couponToISODate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00Z').toISOString()
}

function isoToInputDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function isExpired(coupon: Coupon): boolean {
  if (!coupon.valid_until) return false
  return new Date(coupon.valid_until) < new Date()
}

function statusLabel(coupon: Coupon): { label: string; style: React.CSSProperties } {
  if (!coupon.is_active) return { label: 'Inativo', style: { background: 'var(--surface-2)', color: 'var(--text-2)' } }
  if (isExpired(coupon)) return { label: 'Expirado', style: { background: 'var(--red-soft)', color: 'var(--red)' } }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { label: 'Esgotado', style: { background: 'var(--yellow-soft)', color: 'var(--yellow)' } }
  }
  return { label: 'Ativo', style: { background: 'var(--green-soft)', color: 'var(--green)' } }
}

export function CuponsClient({ initialCoupons }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [drawer, setDrawer] = useState<'closed' | 'new' | 'edit'>('closed')
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [draft, setDraft] = useState<DraftCoupon>(emptyDraft())
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeCount = coupons.filter(c => c.is_active && !isExpired(c)).length
  const totalUses = coupons.reduce((s, c) => s + c.uses_count, 0)

  function openNew() {
    setEditing(null)
    setDraft(emptyDraft())
    setFormError(null)
    setDrawer('new')
  }

  function openEdit(c: Coupon) {
    setEditing(c)
    setDraft({
      code: c.code,
      type: c.type,
      value: String(c.value),
      description: c.description ?? '',
      min_order_value: String(c.min_order_value),
      max_uses: c.max_uses !== null ? String(c.max_uses) : '',
      max_uses_per_user: c.max_uses_per_user !== null ? String(c.max_uses_per_user) : '',
      valid_from: isoToInputDate(c.valid_from),
      valid_until: isoToInputDate(c.valid_until),
      is_active: c.is_active,
    })
    setFormError(null)
    setDrawer('edit')
  }

  function closeDrawer() {
    setDrawer('closed')
    setEditing(null)
    setFormError(null)
  }

  function buildInput() {
    return {
      code: draft.code.toUpperCase().trim(),
      type: draft.type,
      value: parseFloat(draft.value) || 0,
      description: draft.description || null,
      min_order_value: parseFloat(draft.min_order_value) || 0,
      max_uses: draft.max_uses ? parseInt(draft.max_uses) : null,
      max_uses_per_user: draft.max_uses_per_user ? parseInt(draft.max_uses_per_user) : null,
      valid_from: couponToISODate(draft.valid_from),
      valid_until: draft.valid_until ? couponToISODate(draft.valid_until) : null,
      is_active: draft.is_active,
    }
  }

  function handleSave() {
    if (!draft.code.trim()) { setFormError('Informe o código do cupom.'); return }
    if (!draft.value || parseFloat(draft.value) <= 0) { setFormError('Informe um valor válido.'); return }

    startTransition(async () => {
      const input = buildInput()
      let result: { error: string | null }

      if (drawer === 'new') {
        result = await createCoupon(input)
      } else {
        result = await updateCoupon(editing!.id, input)
      }

      if (result.error) {
        setFormError(result.error)
        return
      }

      // Optimistic update: reload from server is handled by revalidatePath,
      // but we keep UI responsive by refreshing the page data
      window.location.reload()
    })
  }

  function handleToggleActive(c: Coupon) {
    startTransition(async () => {
      await toggleCouponActive(c.id, !c.is_active)
      setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCoupon(id)
      if (!result.error) {
        setCoupons(prev => prev.filter(x => x.id !== id))
        setDeleteConfirm(null)
      }
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Cupons de Desconto</h2>
          <p className="page-sub">{coupons.length} cupons · {activeCount} ativos</p>
        </div>
        <div className="page-actions">
          <button
            className="btn primary"
            onClick={openNew}
            id="btn-novo-cupom"
            data-testid="btn-novo-cupom"
          >
            <AdminIcon name="plus" /> Novo cupom
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: 'var(--accent)' }} />Total de cupons</div>
          <div className="kpi-value">{coupons.length}</div>
          <div className="kpi-trend"><span className="subtle">cadastrados</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: 'var(--green)' }} />Cupons ativos</div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-trend"><span className="subtle">válidos agora</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: 'var(--blue)' }} />Total de usos</div>
          <div className="kpi-value">{totalUses}</div>
          <div className="kpi-trend"><span className="subtle">desde a criação</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: 'var(--red)' }} />Expirados</div>
          <div className="kpi-value">{coupons.filter(isExpired).length}</div>
          <div className="kpi-trend"><span className="subtle">prazo vencido</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-body flush">
          {coupons.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
              <AdminIcon name="tag" size={32} />
              <p style={{ marginTop: 12, fontSize: 14 }}>Nenhum cupom cadastrado ainda.</p>
              <button className="btn primary" style={{ marginTop: 16 }} onClick={openNew}>
                Criar primeiro cupom
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th style={{ width: 90 }}>Tipo</th>
                    <th style={{ width: 100 }}>Desconto</th>
                    <th style={{ width: 130 }}>Pedido mínimo</th>
                    <th style={{ width: 100 }}>Usos</th>
                    <th style={{ width: 120 }}>Válido até</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const { label, style: badgeStyle } = statusLabel(c)
                    const usesLabel = c.max_uses !== null
                      ? `${c.uses_count} / ${c.max_uses}`
                      : `${c.uses_count}`

                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{
                              fontFamily: 'ui-monospace, monospace',
                              fontSize: 12,
                              background: 'var(--surface-2)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              letterSpacing: '0.04em',
                              fontWeight: 600,
                              display: 'inline-block',
                            }}>
                              {c.code}
                            </span>
                            {c.description && (
                              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.description}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            {c.type === 'percent' ? 'Percentual' : 'Fixo'}
                          </span>
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          {fmtValue(c)}
                        </td>
                        <td className="num" style={{ color: 'var(--text-2)' }}>
                          {c.min_order_value > 0
                            ? `R$ ${Number(c.min_order_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="num" style={{ color: 'var(--text-2)' }}>
                          {usesLabel}
                        </td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                          {fmtDate(c.valid_until)}
                        </td>
                        <td>
                          <button
                            style={{
                              ...badgeStyle,
                              border: 'none',
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 11.5,
                              fontWeight: 500,
                              cursor: c.is_active ? 'pointer' : 'default',
                            }}
                            onClick={() => c.is_active || isExpired(c) ? handleToggleActive(c) : undefined}
                            title={c.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                            data-testid={`btn-toggle-cupom-${c.id}`}
                          >
                            {label}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              className="icon-btn"
                              onClick={() => openEdit(c)}
                              title="Editar"
                              data-testid={`btn-edit-cupom-${c.id}`}
                            >
                              <AdminIcon name="edit" size={14} />
                            </button>
                            <button
                              className="icon-btn"
                              style={{ color: 'var(--text-3)' }}
                              onClick={() => setDeleteConfirm(c.id)}
                              title="Excluir"
                              data-testid={`btn-delete-cupom-${c.id}`}
                            >
                              <AdminIcon name="trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Drawer criar / editar */}
      <div className={`drawer-backdrop ${drawer !== 'closed' ? 'open' : ''}`} onClick={closeDrawer} />
      <div className={`drawer ${drawer !== 'closed' ? 'open' : ''}`} data-testid="drawer-cupom">
        <div className="drawer-header">
          <div>
            <h3>{drawer === 'new' ? 'Novo Cupom' : 'Editar Cupom'}</h3>
            <div className="cust-meta">{drawer === 'new' ? 'Preencha os dados abaixo' : `Código: ${editing?.code}`}</div>
          </div>
          <button className="icon-btn" onClick={closeDrawer}>
            <AdminIcon name="x" size={14} />
          </button>
        </div>

        <div className="drawer-body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label>Código <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="input"
                value={draft.code}
                onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="EX: BEMVINDA10"
                style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                id="input-cupom-codigo"
                data-testid="input-cupom-codigo"
              />
            </div>

            <div className="field">
              <label>Descrição interna</label>
              <input
                className="input"
                value={draft.description}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                placeholder="Ex: Cupom de boas-vindas Instagram"
                id="input-cupom-descricao"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Tipo <span style={{ color: 'var(--error)' }}>*</span></label>
                <select
                  className="input"
                  value={draft.type}
                  onChange={e => setDraft({ ...draft, type: e.target.value as 'percent' | 'fixed' })}
                  id="select-cupom-tipo"
                  data-testid="select-cupom-tipo"
                >
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>

              <div className="field">
                <label>
                  {draft.type === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}
                  <span style={{ color: 'var(--error)' }}> *</span>
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={draft.type === 'percent' ? 100 : undefined}
                  step={draft.type === 'percent' ? 1 : 0.01}
                  value={draft.value}
                  onChange={e => setDraft({ ...draft, value: e.target.value })}
                  placeholder={draft.type === 'percent' ? '10' : '50.00'}
                  id="input-cupom-valor"
                  data-testid="input-cupom-valor"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Pedido mínimo (R$)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.01}
                  value={draft.min_order_value}
                  onChange={e => setDraft({ ...draft, min_order_value: e.target.value })}
                  placeholder="0"
                  id="input-cupom-minimo"
                />
              </div>

              <div className="field">
                <label>Limite de usos <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>(total geral)</span></label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={draft.max_uses}
                  onChange={e => setDraft({ ...draft, max_uses: e.target.value })}
                  placeholder="Ilimitado"
                  id="input-cupom-max-usos"
                />
              </div>
            </div>

            <div className="field">
              <label>Limite por usuário <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>(vazio = sem limite)</span></label>
              <input
                className="input"
                type="number"
                min={1}
                value={draft.max_uses_per_user}
                onChange={e => setDraft({ ...draft, max_uses_per_user: e.target.value })}
                placeholder="Ex: 1 (cada cliente usa uma vez)"
                id="input-cupom-max-usos-por-usuario"
                data-testid="input-cupom-max-usos-por-usuario"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Válido a partir de <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  className="input"
                  type="date"
                  value={draft.valid_from}
                  onChange={e => setDraft({ ...draft, valid_from: e.target.value })}
                  id="input-cupom-valido-de"
                />
              </div>

              <div className="field">
                <label>Válido até <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>(vazio = sem prazo)</span></label>
                <input
                  className="input"
                  type="date"
                  value={draft.valid_until}
                  onChange={e => setDraft({ ...draft, valid_until: e.target.value })}
                  id="input-cupom-valido-ate"
                  data-testid="input-cupom-valido-ate"
                />
              </div>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={e => setDraft({ ...draft, is_active: e.target.checked })}
                  id="input-cupom-ativo"
                  data-testid="input-cupom-ativo"
                />
                Cupom ativo
              </label>
            </div>

            {formError && (
              <div style={{
                background: 'var(--red-soft)',
                color: 'var(--red)',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
              }}>
                {formError}
              </div>
            )}
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn ghost" onClick={closeDrawer}>Cancelar</button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={isPending}
            id="btn-salvar-cupom"
            data-testid="btn-salvar-cupom"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <>
          <div
            className="drawer-backdrop open"
            style={{ zIndex: 200 }}
            onClick={() => setDeleteConfirm(null)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            zIndex: 201,
            width: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            <h4 style={{ marginBottom: 8, fontSize: 15, fontWeight: 600 }}>Excluir cupom?</h4>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              Esta ação não pode ser desfeita. O cupom será removido permanentemente.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button
                className="btn"
                style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }}
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isPending}
                data-testid="btn-confirmar-exclusao"
              >
                Excluir
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
