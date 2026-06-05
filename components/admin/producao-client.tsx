"use client" // tabs + expand rows + nova OP modal + status transitions

import { useState, useTransition } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import type { ProductionOrderRow, MissingMaterialEntry, WholesaleVariant, RawMaterialRow } from '@/lib/supabase/admin-queries'
import { advanceProductionOrderStatus, cancelProductionOrder, createManualProductionOrder } from '@/lib/actions/production'

interface ProducaoClientProps {
  ops: ProductionOrderRow[]
  variants: WholesaleVariant[]
  materials: RawMaterialRow[]
}

type OpStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled'

const STATUS_MAP: Record<string, { cls: string; txt: string }> = {
  draft: { cls: 'neutral', txt: 'Rascunho' },
  materials_checked: { cls: 'neutral', txt: 'MP Verificada' },
  approved: { cls: 'varejo', txt: 'Aprovado' },
  in_progress: { cls: 'producao', txt: 'Em Andamento' },
  completed: { cls: 'pago', txt: 'Concluído' },
  cancelled: { cls: 'cancelado', txt: 'Cancelado' },
}

const TYPE_MAP: Record<string, string> = {
  corte: 'Corte',
  acabamento: 'Acabamento',
  beneficiamento: 'Beneficiamento',
}

function nextActionLabel(status: string): { label: string; icon: 'checkCircle' | 'factory' | 'check' } | null {
  if (status === 'draft' || status === 'materials_checked') return { label: 'Aprovar', icon: 'checkCircle' }
  if (status === 'approved') return { label: 'Iniciar', icon: 'factory' }
  if (status === 'in_progress') return { label: 'Concluir', icon: 'check' }
  return null
}

export function ProducaoClient({ ops, variants, materials }: ProducaoClientProps) {
  const [activeTab, setActiveTab] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOp, setExpandedOp] = useState<string | null>(null)
  const [showMissing, setShowMissing] = useState<ProductionOrderRow | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  // Nova OP manual
  const [showNovaOp, setShowNovaOp] = useState(false)
  const [novaType, setNovaType] = useState<'acabamento' | 'corte'>('acabamento')
  const [novaOutputId, setNovaOutputId] = useState('')
  const [novaQty, setNovaQty] = useState('1')
  const [novaQtyProd, setNovaQtyProd] = useState('')
  const [novaNotes, setNovaNotes] = useState('')
  const [novaError, setNovaError] = useState('')

  // Retorna a OP que esta OP depende (corte que precisa ser concluído antes)
  function getDependency(op: ProductionOrderRow): ProductionOrderRow | null {
    if (!op.depends_on_op_id) return null
    return ops.find((o) => o.id === op.depends_on_op_id) ?? null
  }

  // Retorna as OPs que dependem desta (acabamentos que esta OP habilita)
  function getDependents(op: ProductionOrderRow): ProductionOrderRow[] {
    return ops.filter((o) => o.depends_on_op_id === op.id)
  }

  const tabs = [
    { id: 'Todos', count: ops.length },
    { id: 'Rascunho', count: ops.filter((o) => o.status === 'draft' || o.status === 'materials_checked').length },
    { id: 'Aprovado', count: ops.filter((o) => o.status === 'approved').length },
    { id: 'Em Andamento', count: ops.filter((o) => o.status === 'in_progress').length },
    { id: 'Concluído', count: ops.filter((o) => o.status === 'completed').length },
  ]

  const filtered = ops.filter((o) => {
    const matchTab = (() => {
      if (activeTab === 'Todos') return true
      if (activeTab === 'Rascunho') return o.status === 'draft' || o.status === 'materials_checked'
      if (activeTab === 'Aprovado') return o.status === 'approved'
      if (activeTab === 'Em Andamento') return o.status === 'in_progress'
      if (activeTab === 'Concluído') return o.status === 'completed'
      return true
    })()
    if (!matchTab) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesCustomer = o.customer_name?.toLowerCase().includes(q) ?? false
      const matchesProduct = getItemLabel(o).toLowerCase().includes(q)
      const matchesId = shortId(o.id).toLowerCase().includes(q)
      return matchesCustomer || matchesProduct || matchesId
    }

    return true
  })

  const emAndamento = ops.filter((o) => o.status === 'in_progress').length
  const aprovados = ops.filter((o) => o.status === 'approved').length

  function handleAdvance(opId: string) {
    setActionError(null)
    startTransition(async () => {
      const res = await advanceProductionOrderStatus(opId)
      if (!res.success) setActionError(res.error)
    })
  }

  function handleCancel(opId: string) {
    if (!confirm('Cancelar esta ordem de produção?')) return
    setActionError(null)
    startTransition(async () => {
      const res = await cancelProductionOrder(opId)
      if (!res.success) setActionError(res.error)
    })
  }

  function handleNovaOp() {
    if (!novaOutputId) { setNovaError('Selecione o produto ou material'); return }
    const qty = parseInt(novaQty)
    if (isNaN(qty) || qty < 1) { setNovaError('Quantidade inválida'); return }
    setNovaError('')
    startTransition(async () => {
      const res = await createManualProductionOrder({
        type: novaType,
        output_id: novaOutputId,
        is_for_material: novaType === 'corte',
        quantity: qty,
        notes: novaNotes || null,
      })
      if (!res.success) {
        setNovaError(res.error)
      } else {
        setShowNovaOp(false)
        setNovaQty('1')
        setNovaNotes('')
        setNovaError('')
      }
    })
  }

  function openNovaOp() {
    setShowNovaOp(true)
    setNovaType('acabamento')
    setNovaOutputId(variants[0]?.id ?? '')
    setNovaQty('1')
    setNovaNotes('')
    setNovaError('')
  }

  function getItemLabel(op: ProductionOrderRow): string {
    const item = op.items[0]
    if (!item) return '—'
    if (item.variant_label) return item.variant_label
    if (item.output_material_name) return item.output_material_name
    return '—'
  }

  function getTotalQty(op: ProductionOrderRow): number {
    return op.items.reduce((s, it) => s + it.quantity_requested, 0)
  }

  function hasMissingMaterials(op: ProductionOrderRow): boolean {
    return op.items.some((it) => it.missing_materials && it.missing_materials.length > 0)
  }

  function shortDate(iso: string) {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  function shortId(id: string) {
    return `OP-${id.replace(/-/g, '').slice(-6).toUpperCase()}`
  }

  const intermediaryMaterials = materials.filter((m) => m.type === 'intermediaria')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Ordens de Produção</h2>
          <p className="page-sub">
            {emAndamento} em andamento · {aprovados} aprovada{aprovados !== 1 ? 's' : ''} aguardando início
          </p>
        </div>
        <div className="page-actions">
          <button className="btn primary" id="btn-nova-op" onClick={openNovaOp}>
            <AdminIcon name="plus" /> Nova ordem
          </button>
        </div>
      </div>

      {actionError && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>
          {actionError}
        </div>
      )}

      <div className="card">
        <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
          <div className="tabs" style={{ marginBottom: 0, flex: 1, borderBottom: 'none' }}>
            {tabs.map((t) => (
              <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.id} <span className="count">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="search-input" style={{ width: 220, marginBottom: 12 }}>
            <AdminIcon name="search" size={13} />
            <input
              placeholder="Cliente, produto ou OP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body flush">
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              {ops.length === 0
                ? 'Nenhuma OP cadastrada. Crie um pedido atacado para gerar OPs automaticamente, ou clique em "Nova ordem".'
                : searchQuery.trim()
                  ? `Nenhuma OP encontrada para "${searchQuery}".`
                  : 'Nenhuma OP com este status.'}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 26 }}></th>
                    <th style={{ width: 120 }}>#</th>
                    <th>Produto / Material</th>
                    <th style={{ width: 100 }}>Cliente</th>
                    <th style={{ width: 80 }}>Tipo</th>
                    <th style={{ width: 80 }}>Qtd.</th>
                    <th style={{ width: 120 }}>Status</th>
                    <th style={{ width: 80 }}>Criado</th>
                    <th style={{ width: 160 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((op) => {
                    const action = nextActionLabel(op.status)
                    const s = STATUS_MAP[op.status] ?? { cls: 'neutral', txt: op.status }
                    const missing = hasMissingMaterials(op)
                    const isExpanded = expandedOp === op.id
                    const dependency = getDependency(op)
                    const dependents = getDependents(op)
                    return (
                      <>
                        <tr
                          key={op.id}
                          style={{ cursor: 'pointer', background: isExpanded ? 'var(--surface-2)' : undefined }}
                          onClick={() => setExpandedOp(isExpanded ? null : op.id)}
                        >
                          <td style={{ paddingRight: 0 }}>
                            <AdminIcon name={isExpanded ? 'chevUp' : 'chevDown'} size={11} style={{ color: 'var(--text-3)' }} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'var(--text-2)' }}>
                                {shortId(op.id)}
                              </span>
                              {dependency && (
                                <span
                                  title={`Aguarda: ${TYPE_MAP[dependency.type]} — ${getItemLabel(dependency)}`}
                                  style={{
                                    fontSize: 9.5, padding: '1px 5px', borderRadius: 3,
                                    background: dependency.status === 'completed' ? 'var(--accent-soft)' : 'var(--surface-3, #ede8f5)',
                                    color: dependency.status === 'completed' ? '#7a4a36' : 'var(--text-2)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {dependency.status === 'completed' ? '✓ corte pronto' : `↑ aguarda ${shortId(dependency.id)}`}
                                </span>
                              )}
                              {dependents.length > 0 && (
                                <span
                                  title={dependents.map((d) => `Habilita: ${getItemLabel(d)}`).join(', ')}
                                  style={{
                                    fontSize: 9.5, padding: '1px 5px', borderRadius: 3,
                                    background: 'var(--accent-soft)', color: '#7a4a36', fontWeight: 500,
                                  }}
                                >
                                  ↓ habilita {dependents.length > 1 ? `${dependents.length} OPs` : shortId(dependents[0].id)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="row" style={{ gap: 10 }}>
                              <div className="thumb bag" style={{ width: 24, height: 24 }}>
                                <AdminIcon name={op.type === 'corte' ? 'layers' : 'bag'} size={12} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 12.5 }}>{getItemLabel(op)}</div>
                                {missing && (
                                  <button
                                    className="linkish"
                                    style={{ fontSize: 11, color: 'var(--red)' }}
                                    onClick={(e) => { e.stopPropagation(); setShowMissing(op) }}
                                  >
                                    ⚠ MP insuficientes
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {op.customer_name ? (
                              <div style={{ fontSize: 11.5, fontWeight: 500, maxWidth: 95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={op.customer_name}>
                                {op.customer_name.split(' ')[0]}
                              </div>
                            ) : (
                              <span className="cust-meta" style={{ fontSize: 11 }}>Avulsa</span>
                            )}
                          </td>
                          <td>
                            <span className="cust-meta" style={{ fontSize: 11.5, fontWeight: 500 }}>
                              {TYPE_MAP[op.type] ?? op.type}
                            </span>
                          </td>
                          <td className="num" style={{ fontWeight: 500 }}>{getTotalQty(op)} un.</td>
                          <td>
                            <span className={`badge ${s.cls}`}>
                              <span className="dot" />{s.txt}
                            </span>
                          </td>
                          <td className="cust-meta">{shortDate(op.created_at)}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              {action && op.status !== 'cancelled' && op.status !== 'completed' && (
                                <button
                                  className="btn sm primary"
                                  id={`btn-op-${op.id}`}
                                  onClick={() => handleAdvance(op.id)}
                                  disabled={isPending}
                                >
                                  <AdminIcon name={action.icon} size={11} /> {action.label}
                                </button>
                              )}
                              {op.status !== 'completed' && op.status !== 'cancelled' && (
                                <button className="icon-btn" title="Cancelar" onClick={() => handleCancel(op.id)} disabled={isPending}>
                                  <AdminIcon name="x" size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── Linha expandida ── */}
                        {isExpanded && (
                          <tr key={`${op.id}-expanded`}>
                            <td colSpan={9} style={{ padding: 0, background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid var(--border)' }}>

                                {/* Itens da OP */}
                                <div style={{ padding: 14, borderRight: '1px solid var(--border)' }}>
                                  <div className="cust-meta" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                    Itens
                                  </div>
                                  {op.items.map((it) => (
                                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12, borderBottom: '1px dashed var(--border)' }}>
                                      <span style={{ fontWeight: 500 }}>{it.variant_label ?? it.output_material_name ?? '—'}</span>
                                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <span className="cust-meta">pedido: {it.quantity_requested}</span>
                                        {it.quantity_produced > 0 && (
                                          <span style={{ color: 'var(--green)', fontSize: 11 }}>produzido: {it.quantity_produced}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Pedido vinculado + observações */}
                                <div style={{ padding: 14, borderRight: '1px solid var(--border)' }}>
                                  <div className="cust-meta" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                    Referência
                                  </div>
                                  {op.order_id ? (
                                    <div style={{ fontSize: 12 }}>
                                      {op.customer_name && (
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{op.customer_name}</div>
                                      )}
                                      <div className="cust-meta" style={{ marginBottom: 2 }}>Pedido atacado</div>
                                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--accent)' }}>
                                        A-{op.order_id.replace(/-/g, '').slice(-4).toUpperCase()}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="cust-meta" style={{ fontSize: 12 }}>Criada manualmente</div>
                                  )}
                                  {op.notes && (
                                    <div style={{ marginTop: 10 }}>
                                      <div className="cust-meta" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Observações</div>
                                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{op.notes}</div>
                                    </div>
                                  )}
                                </div>

                                {/* Cadeia de dependência */}
                                <div style={{ padding: 14 }}>
                                  <div className="cust-meta" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                                    Cadeia de produção
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {/* OP que precede esta (se existir) */}
                                    {dependency && (() => {
                                      const ds = STATUS_MAP[dependency.status] ?? { cls: 'neutral', txt: dependency.status }
                                      const blocking = dependency.status !== 'completed'
                                      return (
                                        <div style={{
                                          padding: '6px 10px', borderRadius: 5, fontSize: 11.5,
                                          background: blocking ? 'var(--red-soft)' : 'var(--surface-2)',
                                          border: `1px solid ${blocking ? 'var(--red)' : 'var(--border)'}`,
                                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                          <div>
                                            <div style={{ fontWeight: 500, fontSize: 11 }}>{TYPE_MAP[dependency.type]} · {shortId(dependency.id)}</div>
                                            <div className="cust-meta" style={{ fontSize: 10.5 }}>{getItemLabel(dependency)}</div>
                                            {blocking && <div style={{ color: 'var(--red)', fontSize: 10, marginTop: 2 }}>⚠ Precisa ser concluída antes desta</div>}
                                          </div>
                                          <span className={`badge ${ds.cls}`} style={{ fontSize: 10 }}><span className="dot" />{ds.txt}</span>
                                        </div>
                                      )
                                    })()}

                                    {/* Esta OP */}
                                    <div style={{
                                      padding: '6px 10px', borderRadius: 5, fontSize: 11.5,
                                      background: 'var(--accent-soft)', border: '2px solid var(--accent-soft-2)',
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: 11 }}>{TYPE_MAP[op.type]} · {shortId(op.id)} <span style={{ fontWeight: 400, color: '#7a4a36' }}>(esta OP)</span></div>
                                        <div style={{ fontSize: 10.5, color: '#7a4a36' }}>{getItemLabel(op)}</div>
                                      </div>
                                      <span className={`badge ${s.cls}`} style={{ fontSize: 10 }}><span className="dot" />{s.txt}</span>
                                    </div>

                                    {/* OPs que esta habilita (se existirem) */}
                                    {dependents.map((d) => {
                                      const ds2 = STATUS_MAP[d.status] ?? { cls: 'neutral', txt: d.status }
                                      return (
                                        <div key={d.id} style={{
                                          padding: '6px 10px', borderRadius: 5, fontSize: 11.5,
                                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                          <div>
                                            <div style={{ fontWeight: 500, fontSize: 11 }}>{TYPE_MAP[d.type]} · {shortId(d.id)}</div>
                                            <div className="cust-meta" style={{ fontSize: 10.5 }}>{getItemLabel(d)}</div>
                                          </div>
                                          <span className={`badge ${ds2.cls}`} style={{ fontSize: 10 }}><span className="dot" />{ds2.txt}</span>
                                        </div>
                                      )
                                    })}

                                    {!dependency && dependents.length === 0 && (
                                      <div className="cust-meta" style={{ fontSize: 11.5 }}>OP independente — sem corte nem acabamento vinculado.</div>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Materiais insuficientes ── */}
      {showMissing && (
        <div className="modal-backdrop" onClick={() => setShowMissing(null)}>
          <div className="modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>
                  <AdminIcon name="alert" size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--red)' }} />
                  Materiais Insuficientes
                </h3>
                <div className="sub">{getItemLabel(showMissing)} · {getTotalQty(showMissing)} unidades</div>
              </div>
              <button className="icon-btn" onClick={() => setShowMissing(null)}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              {showMissing.items.map((item) => (
                item.missing_materials && item.missing_materials.length > 0 && (
                  <table key={item.id} className="tbl">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th style={{ width: 100 }}>Necessário</th>
                        <th style={{ width: 100 }}>Disponível</th>
                        <th style={{ width: 100 }}>Faltando</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.missing_materials.map((m: MissingMaterialEntry) => (
                        <tr key={m.material_id} style={{ background: m.missing > 0 ? 'var(--red-soft)' : undefined }}>
                          <td>
                            <div className="row" style={{ gap: 8 }}>
                              {m.missing > 0
                                ? <AdminIcon name="xCircle" size={13} style={{ color: 'var(--red)' }} />
                                : <AdminIcon name="check" size={13} style={{ color: 'var(--green)' }} />}
                              <span style={{ fontWeight: m.missing > 0 ? 600 : 400, color: m.missing > 0 ? 'var(--red)' : 'var(--text)' }}>
                                {m.material_name}
                              </span>
                            </div>
                          </td>
                          <td className="num">{m.needed} {m.unit}</td>
                          <td className="num">{m.available} {m.unit}</td>
                          <td className="num" style={{ fontWeight: 600, color: m.missing > 0 ? 'var(--red)' : 'var(--text-3)' }}>
                            {m.missing > 0 ? `${m.missing} ${m.unit}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowMissing(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nova Ordem de Produção ── */}
      {showNovaOp && (
        <div className="modal-backdrop" onClick={() => setShowNovaOp(false)}>
          <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Nova Ordem de Produção</h3>
                <div className="sub">Cria uma OP avulsa, fora de pedido de atacado</div>
              </div>
              <button className="icon-btn" onClick={() => setShowNovaOp(false)}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label>Tipo</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(['acabamento', 'corte'] as const).map((t) => (
                      <button
                        key={t}
                        className={`btn ${novaType === t ? 'primary' : 'ghost'}`}
                        style={{ justifyContent: 'center' }}
                        onClick={() => {
                          setNovaType(t)
                          setNovaOutputId(t === 'acabamento' ? (variants[0]?.id ?? '') : (intermediaryMaterials[0]?.id ?? ''))
                        }}
                      >
                        <AdminIcon name={t === 'corte' ? 'layers' : 'bag'} size={12} />
                        {t === 'acabamento' ? 'Acabamento (produto)' : 'Corte (material)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>{novaType === 'acabamento' ? 'Variante de produto' : 'Material intermediário (saída)'}</label>
                  {novaType === 'acabamento' ? (
                    <select className="select" value={novaOutputId} onChange={(e) => setNovaOutputId(e.target.value)}>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select className="select" value={novaOutputId} onChange={(e) => setNovaOutputId(e.target.value)}>
                      {intermediaryMaterials.length === 0 && (
                        <option value="">Nenhum material intermediário cadastrado</option>
                      )}
                      {intermediaryMaterials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label>Quantidade a produzir</label>
                    <input className="input" type="number" min={1} value={novaQty} onChange={(e) => setNovaQty(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Qtd. já produzida (opcional)</label>
                    <input className="input" type="number" min={0} value={novaQtyProd} onChange={(e) => setNovaQtyProd(e.target.value)} placeholder="0" />
                  </div>
                </div>

                <div className="field">
                  <label>Observações (opcional)</label>
                  <textarea
                    className="input"
                    rows={2}
                    style={{ height: 'auto', padding: 8, resize: 'vertical' }}
                    placeholder="Ex: Prioridade alta, entregar até..."
                    value={novaNotes}
                    onChange={(e) => setNovaNotes(e.target.value)}
                  />
                </div>

                {novaError && <div style={{ color: 'var(--red)', fontSize: 12 }}>{novaError}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowNovaOp(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleNovaOp} disabled={isPending}>
                <AdminIcon name="plus" size={12} />
                {isPending ? 'Criando...' : 'Criar ordem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
