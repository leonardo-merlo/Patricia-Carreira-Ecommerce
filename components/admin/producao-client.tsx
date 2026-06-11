"use client" // interactive: kanban, modal de checklist, nova OP

import { useState, useTransition } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import type {
  ProductionOrderRow,
  MissingMaterialEntry,
  WholesaleVariant,
} from '@/lib/supabase/admin-queries'
import {
  createManualProductionOrder,
  advanceProductionOrderStatus,
  cancelProductionOrder,
  checkAndSetMaterials,
  toggleMaterialCheck,
} from '@/lib/actions/production'

interface ProducaoClientProps {
  ops: ProductionOrderRow[]
  variants: WholesaleVariant[]
}

const COLUMNS: { status: string; label: string }[] = [
  { status: 'draft', label: 'Rascunho' },
  { status: 'approved', label: 'Aprovado' },
  { status: 'in_progress', label: 'Em Andamento' },
  { status: 'completed', label: 'Concluído' },
]

const ADVANCE_LABEL: Record<string, string> = {
  draft: 'Aprovar',
  approved: 'Iniciar',
  in_progress: 'Concluir',
}

function categoryStatus(
  category: string,
  missing: MissingMaterialEntry[],
): 'ok' | 'needs_laser' | 'needs_purchase' {
  const entry = missing.find((m) => m.category === category)
  if (!entry) return 'ok'
  if (
    category === 'Couro' &&
    entry.couro_bruto_available != null &&
    entry.couro_bruto_available > 0
  ) {
    return 'needs_laser'
  }
  return 'needs_purchase'
}

function categoriesForOp(op: ProductionOrderRow): string[] {
  const fromMissing = op.missing_materials.map((m) => m.category)
  const fromChecks = Object.keys(op.material_checks)
  return Array.from(new Set([...fromChecks, ...fromMissing]))
}

export function ProducaoClient({ ops, variants }: ProducaoClientProps) {
  const [selectedOp, setSelectedOp] = useState<ProductionOrderRow | null>(null)
  const [showNovaOp, setShowNovaOp] = useState(false)
  const [novaVariantId, setNovaVariantId] = useState(variants[0]?.id ?? '')
  const [novaQty, setNovaQty] = useState('1')
  const [novaNotes, setNovaNotes] = useState('')
  const [novaError, setNovaError] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const displaySelected = selectedOp
    ? (ops.find((o) => o.id === selectedOp.id) ?? selectedOp)
    : null

  function handleAdvance(op: ProductionOrderRow) {
    setActionError(null)
    startTransition(async () => {
      const res = await advanceProductionOrderStatus(op.id)
      if (!res.success) setActionError(res.error)
    })
  }

  function handleCancel(op: ProductionOrderRow) {
    setActionError(null)
    startTransition(async () => {
      const res = await cancelProductionOrder(op.id)
      if (!res.success) setActionError(res.error)
      else setSelectedOp(null)
    })
  }

  function handleRefreshMaterials(op: ProductionOrderRow) {
    startTransition(async () => {
      await checkAndSetMaterials(op.id)
    })
  }

  function handleToggleCheck(op: ProductionOrderRow, category: string, checked: boolean) {
    startTransition(async () => {
      await toggleMaterialCheck(op.id, category, checked)
    })
  }

  function handleCreateOp() {
    const qty = parseInt(novaQty)
    if (!novaVariantId) { setNovaError('Selecione uma variante'); return }
    if (isNaN(qty) || qty < 1) { setNovaError('Quantidade inválida'); return }
    setNovaError('')
    startTransition(async () => {
      const res = await createManualProductionOrder({
        product_variant_id: novaVariantId,
        quantity: qty,
        order_id: null,
        notes: novaNotes.trim() || null,
      })
      if (res.success) {
        setShowNovaOp(false)
        setNovaQty('1')
        setNovaNotes('')
      } else {
        setNovaError(res.error)
      }
    })
  }

  const activeCount = ops.filter((o) => !['completed', 'cancelled'].includes(o.status)).length

  return (
    <div className="admin-page" id="producao-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produção</h1>
          <p className="page-subtitle">{activeCount} {activeCount === 1 ? 'ordem ativa' : 'ordens ativas'}</p>
        </div>
        <button id="btn-nova-op" className="btn btn-primary" onClick={() => setShowNovaOp(true)}>
          <AdminIcon name="plus" /> Nova OP
        </button>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="kanban-board">
        {COLUMNS.map(({ status, label }) => {
          const colOps = ops.filter((o) => o.status === status)
          return (
            <div key={status} className="kanban-column" data-status={status}>
              <div className="kanban-column-header">
                <span className="kanban-column-title">{label}</span>
                <span className="kanban-column-count">{colOps.length}</span>
              </div>
              <div className="kanban-column-body">
                {colOps.map((op) => (
                  <OpCard
                    key={op.id}
                    op={op}
                    onSelect={() => setSelectedOp(op)}
                    onAdvance={() => handleAdvance(op)}
                    isPending={isPending}
                  />
                ))}
                {colOps.length === 0 && (
                  <p className="kanban-empty">Nenhuma OP</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {displaySelected && (
        <div className="modal-overlay" onClick={() => setSelectedOp(null)}>
          <div
            className="modal-panel"
            id={`op-detail-${displaySelected.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <OpDetailModal
              op={displaySelected}
              onAdvance={() => handleAdvance(displaySelected)}
              onCancel={() => handleCancel(displaySelected)}
              onRefresh={() => handleRefreshMaterials(displaySelected)}
              onToggleCheck={(cat, val) => handleToggleCheck(displaySelected, cat, val)}
              onClose={() => setSelectedOp(null)}
              isPending={isPending}
            />
          </div>
        </div>
      )}

      {showNovaOp && (
        <div className="modal-overlay" onClick={() => setShowNovaOp(false)}>
          <div className="modal-panel" id="nova-op-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nova Ordem de Produção</h2>
              <button className="modal-close" onClick={() => setShowNovaOp(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Variante do produto</label>
                <select
                  id="nova-op-variant"
                  className="select"
                  value={novaVariantId}
                  onChange={(e) => setNovaVariantId(e.target.value)}
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantidade a produzir</label>
                <input
                  id="nova-op-qty"
                  type="number"
                  min="1"
                  className="input"
                  value={novaQty}
                  onChange={(e) => setNovaQty(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Observações (opcional)</label>
                <textarea
                  id="nova-op-notes"
                  className="input"
                  value={novaNotes}
                  onChange={(e) => setNovaNotes(e.target.value)}
                />
              </div>
              {novaError && <p className="error-msg">{novaError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNovaOp(false)}>Cancelar</button>
              <button
                id="btn-criar-op"
                className="btn btn-primary"
                disabled={isPending}
                onClick={handleCreateOp}
              >
                {isPending ? 'Criando...' : 'Criar OP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── OpCard ────────────────────────────────────────────────────────────────────

function OpCard({
  op,
  onSelect,
  onAdvance,
  isPending,
}: {
  op: ProductionOrderRow
  onSelect: () => void
  onAdvance: () => void
  isPending: boolean
}) {
  const categories = categoriesForOp(op)

  return (
    <div
      className={`op-card${op.materials_sufficient === false ? ' op-card--missing' : ''}`}
      id={`op-card-${op.id}`}
      data-testid="op-card"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect() }}
    >
      <div className="op-card-title">{op.variant_label ?? '—'}</div>
      <div className="op-card-meta">
        Qtd: {op.quantity_requested}
        {op.customer_name && <span> · {op.customer_name}</span>}
      </div>
      <div className="op-card-categories">
        {categories.map((cat) => {
          const checked = op.material_checks[cat] ?? false
          const hasMissing = op.missing_materials.some((m) => m.category === cat)
          return (
            <span
              key={cat}
              className={`op-cat-badge${checked ? ' op-cat-badge--done' : hasMissing ? ' op-cat-badge--missing' : ' op-cat-badge--ok'}`}
            >
              {cat}
            </span>
          )
        })}
      </div>
      {ADVANCE_LABEL[op.status] && (
        <button
          className="btn btn-sm btn-ghost op-card-advance"
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); onAdvance() }}
          data-testid="btn-advance-op"
        >
          {ADVANCE_LABEL[op.status]} →
        </button>
      )}
    </div>
  )
}

// ── OpDetailModal ─────────────────────────────────────────────────────────────

function OpDetailModal({
  op,
  onAdvance,
  onCancel,
  onRefresh,
  onToggleCheck,
  onClose,
  isPending,
}: {
  op: ProductionOrderRow
  onAdvance: () => void
  onCancel: () => void
  onRefresh: () => void
  onToggleCheck: (category: string, value: boolean) => void
  onClose: () => void
  isPending: boolean
}) {
  const categories = categoriesForOp(op)

  return (
    <>
      <div className="modal-header">
        <div>
          <h2 className="modal-title">{op.variant_label}</h2>
          <p className="modal-subtitle">
            {op.variant_sku} · Qtd: {op.quantity_requested}
            {op.customer_name && ` · ${op.customer_name}`}
          </p>
        </div>
        <button className="modal-close" onClick={onClose} data-testid="btn-close-op-detail">✕</button>
      </div>

      <div className="modal-body">
        {categories.length === 0 ? (
          <p className="text-muted">Este produto não tem BOM cadastrado.</p>
        ) : (
          <div className="op-checklist" id="op-material-checklist">
            <div className="op-checklist-header">
              <span>Materiais necessários</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={onRefresh}
                disabled={isPending}
                data-testid="btn-refresh-materials"
              >
                ↻ Atualizar disponibilidade
              </button>
            </div>

            {categories.map((cat) => {
              const status = categoryStatus(cat, op.missing_materials)
              const checked = op.material_checks[cat] ?? false
              const missingEntry = op.missing_materials.find((m) => m.category === cat)

              return (
                <div
                  key={cat}
                  className={`op-check-row op-check-row--${status}`}
                  data-testid={`op-check-row-${cat.toLowerCase()}`}
                >
                  <label className="op-check-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleCheck(cat, e.target.checked)}
                      data-testid={`check-${cat.toLowerCase()}`}
                    />
                    <span className="op-check-category">{cat}</span>
                  </label>

                  <span className={`op-check-status op-check-status--${status}`}>
                    {status === 'ok' && '✅ Disponível'}
                    {status === 'needs_laser' && '⚠️ Precisa de laser'}
                    {status === 'needs_purchase' && '❌ Comprar'}
                  </span>

                  {missingEntry && (
                    <div className="op-check-detail">
                      {status === 'needs_laser' && (
                        <span>
                          Couro bruto disponível ({missingEntry.couro_bruto_available} {missingEntry.unit}) — enviar para laser antes de usar
                        </span>
                      )}
                      {status === 'needs_purchase' && (
                        <span>
                          Falta {missingEntry.missing.toLocaleString('pt-BR')} {missingEntry.unit} — adicionar às compras
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {op.notes && (
          <div className="op-notes">
            <strong>Obs:</strong> {op.notes}
          </div>
        )}
      </div>

      <div className="modal-footer">
        {op.status !== 'completed' && op.status !== 'cancelled' && (
          <button
            className="btn btn-ghost btn-danger"
            onClick={onCancel}
            disabled={isPending}
            data-testid="btn-cancel-op"
          >
            Cancelar OP
          </button>
        )}
        {ADVANCE_LABEL[op.status] && (
          <button
            className="btn btn-primary"
            onClick={onAdvance}
            disabled={isPending}
            data-testid="btn-advance-op-detail"
          >
            {isPending ? 'Salvando...' : ADVANCE_LABEL[op.status]}
          </button>
        )}
      </div>
    </>
  )
}
