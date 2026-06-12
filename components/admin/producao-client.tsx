"use client" // interactive: kanban, modal de checklist, nova OP

import { useState, useTransition } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import type {
  ProductionOrderRow,
  MissingMaterialEntry,
  OpMaterial,
  WholesaleVariant,
} from '@/lib/supabase/admin-queries'
import {
  createManualProductionOrder,
  advanceProductionOrderStatus,
  cancelProductionOrder,
  checkAndSetMaterials,
  toggleMaterialCheck,
  setProductionOrderStatus,
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

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  approved: 'Aprovado',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

interface PendingAction {
  type: 'drag' | 'iniciar'
  op: ProductionOrderRow
  targetStatus?: string
}

type MaterialStatus = 'ok' | 'needs_laser' | 'needs_purchase'

function materialStatus(m: OpMaterial, missing: MissingMaterialEntry[]): MaterialStatus {
  if (m.sufficient) return 'ok'
  const entry = missing.find((x) => x.material_id === m.material_id)
  if (
    m.category === 'Couro' &&
    entry?.couro_bruto_available != null &&
    entry.couro_bruto_available > 0
  ) {
    return 'needs_laser'
  }
  return 'needs_purchase'
}

// Agrupa os materiais da OP por categoria, preservando a ordem de aparição.
function groupByCategory(materials: OpMaterial[]): [string, OpMaterial[]][] {
  const map = new Map<string, OpMaterial[]>()
  for (const m of materials) {
    const arr = map.get(m.category) ?? []
    arr.push(m)
    map.set(m.category, arr)
  }
  return Array.from(map.entries())
}

function fmtQty(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [dragOpId, setDragOpId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  const displaySelected = selectedOp
    ? (ops.find((o) => o.id === selectedOp.id) ?? selectedOp)
    : null

  function handleAdvance(op: ProductionOrderRow) {
    // "Iniciar" (approved → in_progress) requires confirmation
    if (op.status === 'approved') {
      setPendingAction({ type: 'iniciar', op })
      return
    }
    executeAdvance(op)
  }

  function executeAdvance(op: ProductionOrderRow) {
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

  function handleToggleCheck(op: ProductionOrderRow, key: string, checked: boolean) {
    startTransition(async () => {
      await toggleMaterialCheck(op.id, key, checked)
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

  function handleDragStart(opId: string) {
    setDragOpId(opId)
  }

  function handleDragEnd() {
    setDragOpId(null)
    setDragOverStatus(null)
  }

  // Permite arrastar para frente OU para trás. Qualquer coluna diferente da
  // atual abre a barra de confirmação antes de efetivar a mudança.
  function handleDrop(targetStatus: string) {
    const opId = dragOpId
    setDragOpId(null)
    setDragOverStatus(null)
    if (!opId) return
    const op = ops.find((o) => o.id === opId)
    if (!op || op.status === targetStatus) return
    setPendingAction({ type: 'drag', op, targetStatus })
  }

  function confirmPendingAction() {
    if (!pendingAction) return
    const { type, op, targetStatus } = pendingAction
    setPendingAction(null)
    setActionError(null)

    if (type === 'iniciar') {
      startTransition(async () => {
        const res = await advanceProductionOrderStatus(op.id)
        if (!res.success) setActionError(res.error)
      })
    } else if (type === 'drag' && targetStatus) {
      startTransition(async () => {
        const res = await setProductionOrderStatus(op.id, targetStatus)
        if (!res.success) setActionError(res.error)
      })
    }
  }

  const activeCount = ops.filter((o) => !['completed', 'cancelled'].includes(o.status)).length

  return (
    <div className="page" id="producao-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produção</h1>
          <p className="page-subtitle">{activeCount} {activeCount === 1 ? 'ordem ativa' : 'ordens ativas'}</p>
        </div>
        <button id="btn-nova-op" className="btn primary" onClick={() => setShowNovaOp(true)}>
          <AdminIcon name="plus" /> Nova OP
        </button>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      {pendingAction && (
        <div className="modal-backdrop" onClick={() => setPendingAction(null)}>
          <div
            className="modal confirm-modal"
            id="confirm-modal"
            data-testid="confirm-bar"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-modal-icon">
              <AdminIcon name="alert" size={22} />
            </div>
            <h3 className="confirm-modal-title">
              {pendingAction.type === 'iniciar' ? 'Iniciar produção?' : 'Mover ordem de produção?'}
            </h3>
            <p className="confirm-modal-text">
              {pendingAction.type === 'iniciar' ? (
                <>Confirmar o início da produção de <b>{pendingAction.op.variant_label}</b>?</>
              ) : (
                <>
                  Mover <b>{pendingAction.op.variant_label}</b> para a coluna{' '}
                  <b>{STATUS_LABEL[pendingAction.targetStatus ?? '']}</b>?
                </>
              )}
            </p>
            <div className="confirm-modal-actions">
              <button
                className="btn ghost"
                onClick={() => setPendingAction(null)}
                data-testid="btn-cancel-action"
              >
                Cancelar
              </button>
              <button
                className="btn primary"
                onClick={confirmPendingAction}
                disabled={isPending}
                data-testid="btn-confirm-action"
              >
                {pendingAction.type === 'iniciar' ? 'Iniciar' : 'Mover'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="kanban-board">
        {COLUMNS.map(({ status, label }) => {
          const colOps = ops.filter((o) => o.status === status)
          const draggedOp = dragOpId ? ops.find((o) => o.id === dragOpId) : null
          const isDropTarget =
            dragOverStatus === status && draggedOp != null && draggedOp.status !== status
          return (
            <div
              key={status}
              className={`kanban-column${isDropTarget ? ' kanban-column--drop-target' : ''}`}
              data-status={status}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOpId && dragOverStatus !== status) setDragOverStatus(status)
              }}
              onDragLeave={(e) => {
                // só limpa se o ponteiro saiu da coluna inteira, não de um filho
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDragOverStatus((cur) => (cur === status ? null : cur))
                }
              }}
              onDrop={() => handleDrop(status)}
            >
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
                    onToggleCheck={(key, val) => handleToggleCheck(op, key, val)}
                    onDragStart={() => handleDragStart(op.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={dragOpId === op.id}
                    isPending={isPending}
                  />
                ))}
                {isDropTarget && (
                  <div className="kanban-drop-placeholder">Soltar aqui → {label}</div>
                )}
                {colOps.length === 0 && !isDropTarget && (
                  <p className="kanban-empty">Nenhuma OP</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail modal — fixed centered overlay */}
      {displaySelected && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(0,0,0,0.4)',
            }}
            onClick={() => setSelectedOp(null)}
            aria-hidden="true"
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              className="modal"
              id={`op-detail-${displaySelected.id}`}
              style={{
                background: 'var(--bg-surface, #fff)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                width: '100%',
                maxWidth: 512,
                maxHeight: '80vh',
                overflowY: 'auto',
                pointerEvents: 'auto',
              }}
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
        </>
      )}

      {showNovaOp && (
        <div className="modal-backdrop" onClick={() => setShowNovaOp(false)}>
          <div className="modal" id="nova-op-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Ordem de Produção</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-3)', padding: '0 4px' }} onClick={() => setShowNovaOp(false)}>✕</button>
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
              {novaError && <p style={{ color: 'var(--red)', fontSize: 12, margin: '4px 0 0' }}>{novaError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowNovaOp(false)}>Cancelar</button>
              <button
                id="btn-criar-op"
                className="btn primary"
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
  onToggleCheck,
  onDragStart,
  onDragEnd,
  isDragging,
  isPending,
}: {
  op: ProductionOrderRow
  onSelect: () => void
  onAdvance: () => void
  onToggleCheck: (key: string, value: boolean) => void
  onDragStart: () => void
  onDragEnd: () => void
  isDragging: boolean
  isPending: boolean
}) {
  const groups = groupByCategory(op.materials)

  return (
    <div
      className={`op-card${op.materials_sufficient === false ? ' op-card--missing' : ''}${isDragging ? ' op-card--dragging' : ''}`}
      id={`op-card-${op.id}`}
      data-testid="op-card"
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
    >
      <div className="op-card-title">{op.variant_label ?? '—'}</div>
      <div className="op-card-meta">
        Qtd: {op.quantity_requested}
        {op.customer_name && <span> · {op.customer_name}</span>}
      </div>

      {groups.length > 0 && (
        // stopPropagation: marcar materiais não deve abrir o modal nem selecionar o card
        <div
          className="op-card-materials"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {groups.map(([category, mats]) => (
            <div key={category} className="op-mat-group">
              <div className="op-mat-group-title">{category}</div>
              {mats.map((m) => {
                const checked = op.material_checks[m.material_id] ?? false
                return (
                  <label key={m.material_id} className="op-mat-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleCheck(m.material_id, e.target.checked)}
                      data-testid={`mat-check-${m.material_id}`}
                    />
                    <span className={`op-mat-name${checked ? ' op-mat-name--done' : ''}`}>
                      {m.material_name}
                    </span>
                    <span className={`op-mat-avail ${m.sufficient ? 'ok' : 'low'}`}>
                      {m.sufficient ? '✓' : `falta ${fmtQty(m.needed - m.available)} ${m.unit}`}
                    </span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {ADVANCE_LABEL[op.status] && (
        <button
          className="btn sm ghost op-card-advance"
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
  onToggleCheck: (key: string, value: boolean) => void
  onClose: () => void
  isPending: boolean
}) {
  const groups = groupByCategory(op.materials)

  return (
    <>
      <div className="modal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3>{op.variant_label}</h3>
          <div className="sub">
            {op.variant_sku} · Qtd: {op.quantity_requested}
            {op.customer_name && ` · ${op.customer_name}`}
          </div>
        </div>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
          onClick={onClose}
          data-testid="btn-close-op-detail"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      <div className="modal-body">
        {op.materials.length === 0 ? (
          <p className="cust-meta">Este produto não tem BOM cadastrado.</p>
        ) : (
          <div className="op-checklist" id="op-material-checklist">
            <div className="op-checklist-header">
              <span>Materiais necessários</span>
              <button
                className="btn sm ghost"
                onClick={onRefresh}
                disabled={isPending}
                data-testid="btn-refresh-materials"
              >
                ↻ Atualizar disponibilidade
              </button>
            </div>

            {groups.map(([category, mats]) => (
              <div key={category} className="op-check-group">
                <div className="op-check-group-title">{category}</div>
                {mats.map((m) => {
                  const status = materialStatus(m, op.missing_materials)
                  const checked = op.material_checks[m.material_id] ?? false
                  const entry = op.missing_materials.find((x) => x.material_id === m.material_id)

                  return (
                    <div
                      key={m.material_id}
                      className={`op-check-row op-check-row--${status}`}
                      data-testid={`op-check-row-${m.material_id}`}
                    >
                      <label className="op-check-label">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => onToggleCheck(m.material_id, e.target.checked)}
                          data-testid={`check-${m.material_id}`}
                        />
                        <span className="op-check-category">{m.material_name}</span>
                      </label>

                      <span className={`op-check-status op-check-status--${status}`}>
                        {status === 'ok' && '✅ Disponível'}
                        {status === 'needs_laser' && '⚠️ Precisa de laser'}
                        {status === 'needs_purchase' && '❌ Comprar'}
                      </span>

                      {!m.sufficient && (
                        <div className="op-check-detail">
                          {status === 'needs_laser' && entry ? (
                            <span>
                              Couro bruto disponível ({fmtQty(entry.couro_bruto_available ?? 0)} {m.unit}) — enviar para laser antes de usar
                            </span>
                          ) : (
                            <span>
                              Necessário {fmtQty(m.needed)} {m.unit} · estoque {fmtQty(m.available)} · faltam {fmtQty(m.needed - m.available)} {m.unit}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
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
            className="btn danger-outline"
            onClick={onCancel}
            disabled={isPending}
            data-testid="btn-cancel-op"
          >
            Cancelar OP
          </button>
        )}
        {ADVANCE_LABEL[op.status] && (
          <button
            className="btn primary"
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
