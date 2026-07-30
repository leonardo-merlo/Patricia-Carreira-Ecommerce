"use client" // interactive: entry modal, BOM editor, receive purchase modal

import { useState, useTransition } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import type { RawMaterialRow, ProductWithBOM, PurchaseRequestRow } from '@/lib/supabase/admin-queries'
import type { Supplier } from '@/lib/actions/suppliers'
import {
  registerMaterialEntry,
  createRawMaterial,
  registerMaterialExit,
  addBOMEntry,
  updateBOMEntry,
  deleteBOMEntry,
  receivePurchaseRequest,
  cancelPurchaseRequest,
} from '@/lib/actions/raw-materials'

// Categorias espelham as seções da ficha técnica do Henrique.
const CATEGORIES = ['Corte Lona', 'Corte Forro', 'Corte Couro', 'Aplicações', 'Metais', 'Aviamentos'] as const
type Category = typeof CATEGORIES[number]

// Cortes têm cor; a receita do produto guarda só o tipo e a variante define a cor.
const CUT_CATEGORIES: readonly Category[] = ['Corte Lona', 'Corte Forro', 'Corte Couro']

function isCutCategory(category: string): boolean {
  return (CUT_CATEGORIES as readonly string[]).includes(category)
}

// tipo: a peça específica dentro da categoria, nomeada como na ficha
const TIPOS: Record<Category, string[]> = {
  'Corte Lona': [
    'Frente', 'Costas', 'Lateral', 'Lateral 1', 'Lateral 2',
    'Faixa da boca', 'Tira da boca', 'Viés da boca', 'Alça', 'Meio',
  ],
  'Corte Forro': [
    'Frente', 'Costas', 'Frente e costas (peça única)', 'Lateral', 'Lateral 1', 'Lateral 2',
    'Bolso de trás', 'Bolso de dentro', 'Bolso canguru',
  ],
  'Corte Couro': [
    'Casinha', 'Boca de palhaço', 'Alça', 'Alça de couro', 'Acabamento de alça',
    'Couro boca zíper', 'Corte H', 'Corte alça Flora A', 'Corte alça Flora B',
    'Tira 20 cm', 'Tira 43 cm', 'Tira 48 cm', 'Tira barra alça 15 cm',
    'Tirinha/alça 7 cm', 'Tirinha barra alça 7 cm', 'Tirinha do fecho de dentro 5 cm',
  ],
  'Aplicações': [
    'Nirvana A', 'Nirvana B', 'Nirvana C', 'Nirvana D', 'Nirvana E', 'Nirvana F',
    'Lyra A', 'Lyra B',
    'Liberty A', 'Liberty B', 'Liberty C', 'Liberty D', 'Liberty E', 'Liberty F',
    'Flora A', 'Flora B', 'Flora C', 'Flora D', 'Flora E',
    'Mandala A', 'Mandala B', 'Mandala C', 'Mandala D', 'Mandala E', 'Mandala F', 'Mandala G', 'Mandala H',
  ],
  Metais: [
    'Rebite', 'Argola G', 'Meia argola 1,5 cm',
    'Mosquetão G', 'Mosquetão médio', 'Mosquetão P', 'Cursor diamante', 'Ímã',
  ],
  Aviamentos: [
    'Fecho metro 20 cm', 'Fecho metro 30 cm', 'Fecho metro 40 cm', 'Fecho metro 45 cm',
    'Fecho padrão 18 cm', 'Viés 1 metro', 'Viés 2,5 cm', 'Viés 3 cm', 'Gorgurão',
    'Etiqueta bordada', 'Etiqueta de composição',
  ],
}

const UNITS = ['metro', 'unidade', 'kg', 'cm'] as const

interface MateriasClientProps {
  materials: RawMaterialRow[]
  products: ProductWithBOM[]
  purchaseRequests: PurchaseRequestRow[]
  suppliers: Supplier[]
}

function stockState(cur: number, min: number) {
  if (cur === 0) return { cls: 'out', badge: <span className="badge esgotado">Esgotado</span> }
  if (cur < min) return { cls: 'low', badge: <span className="badge baixo">Baixo</span> }
  return { cls: 'ok', badge: null }
}

function formatQty(qty: number, unit: string) {
  return `${qty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}`
}

export function MateriasClient({ materials, products, purchaseRequests, suppliers }: MateriasClientProps) {
  // ── Abas ──
  const [tab, setTab] = useState<'insumos' | 'receitas' | 'compras'>('insumos')

  // ── Busca e filtro de insumos ──
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  // ── Exit modal ──
  const [exitFor, setExitFor] = useState<RawMaterialRow | null>(null)
  const [exitQty, setExitQty] = useState('1')
  const [exitReason, setExitReason] = useState<'perda' | 'ajuste' | 'uso_manual'>('ajuste')
  const [exitNotes, setExitNotes] = useState('')
  const [exitError, setExitError] = useState('')

  // ── Entry modal ──
  const [entryFor, setEntryFor] = useState<RawMaterialRow | null>(null)
  const [entryQty, setEntryQty] = useState('1')
  const [entryReason, setEntryReason] = useState<'compra' | 'ajuste' | 'devolucao'>('compra')
  const [entryNotes, setEntryNotes] = useState('')
  const [entryError, setEntryError] = useState('')

  // ── BOM viewer/editor (receita é do produto, herdada por todas as variantes) ──
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? '')
  const [bomEditMode, setBomEditMode] = useState(false)
  const [editingQty, setEditingQty] = useState<Record<string, string>>({})
  const [addMaterialId, setAddMaterialId] = useState(materials[0]?.id ?? '')
  const [addQty, setAddQty] = useState('1')
  const [bomError, setBomError] = useState('')

  // ── Receive purchase modal ──
  const [receiveFor, setReceiveFor] = useState<PurchaseRequestRow | null>(null)
  const [receiveQty, setReceiveQty] = useState('')
  const [receiveError, setReceiveError] = useState('')

  // ── Nova matéria-prima modal ──
  const [showNewMaterial, setShowNewMaterial] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<string>(CATEGORIES[0])
  const [newTipo, setNewTipo] = useState<string>(() => TIPOS[CATEGORIES[0]]?.[0] ?? '')
  const [newColor, setNewColor] = useState<string>('')
  const [newUnit, setNewUnit] = useState<'metro' | 'unidade' | 'kg' | 'cm'>('unidade')
  const [newStock, setNewStock] = useState('0')
  const [newMinStock, setNewMinStock] = useState('0')
  const [newCost, setNewCost] = useState('')
  const [newSupplierId, setNewSupplierId] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newError, setNewError] = useState('')

  const [isPending, startTransition] = useTransition()

  const lowCount = materials.filter((m) => m.stock_quantity < m.minimum_stock).length
  const filteredMaterials = materials.filter((m) => {
    if (catFilter !== 'all' && m.category !== catFilter) return false
    if (search.trim() && !m.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })
  const productsWithBOM = products.filter((p) => p.bom.length > 0)
  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null

  const estimatedCost = selectedProduct
    ? selectedProduct.bom.reduce((sum, b) => {
        if (b.material.cost_per_unit == null) return sum
        return sum + b.material.cost_per_unit * b.quantity_needed
      }, 0)
    : 0

  // Cores já cadastradas, para sugerir no formulário de novo insumo
  const knownColors = Array.from(
    new Set(materials.map((m) => m.color).filter((c): c is string => Boolean(c))),
  ).sort()

  // Insumos já na receita. Cortes entram por categoria+tipo (sem cor), então a
  // chave precisa ser a mesma dos dois lados.
  const bomKey = (category: string, type: string | null, id: string) =>
    isCutCategory(category) ? `${category}||${type ?? ''}` : id

  const usedKeys = new Set(
    (selectedProduct?.bom ?? []).map((b) => bomKey(b.material_category, b.material_type, b.material.id ?? '')),
  )
  const availableMaterials = materials.filter(
    (m) => !usedKeys.has(bomKey(m.category, m.type_specific, m.id)),
  )

  function handleEntry() {
    if (!entryFor) return
    const qty = parseFloat(entryQty.replace(',', '.'))
    if (isNaN(qty) || qty <= 0) { setEntryError('Informe uma quantidade válida'); return }
    setEntryError('')
    startTransition(async () => {
      const res = await registerMaterialEntry({
        material_id: entryFor.id,
        quantity: qty,
        reason: entryReason,
        notes: entryNotes || null,
      })
      if (res.success) {
        setEntryFor(null)
        setEntryQty('1')
        setEntryNotes('')
      } else {
        setEntryError(res.error)
      }
    })
  }

  function handleAddBOM() {
    if (!selectedProductId || !addMaterialId) return
    const qty = parseFloat(addQty.replace(',', '.'))
    if (isNaN(qty) || qty <= 0) { setBomError('Quantidade inválida'); return }
    setBomError('')
    startTransition(async () => {
      const res = await addBOMEntry({
        product_id: selectedProductId,
        raw_material_id: addMaterialId,
        quantity_needed: qty,
      })
      if (res.success) {
        setAddQty('1')
        setAddMaterialId(availableMaterials[0]?.id ?? '')
      } else {
        setBomError(res.error)
      }
    })
  }

  function handleUpdateBOM(bomId: string) {
    const rawVal = editingQty[bomId]
    if (!rawVal) return
    const qty = parseFloat(rawVal.replace(',', '.'))
    if (isNaN(qty) || qty <= 0) return
    startTransition(async () => {
      await updateBOMEntry({ bom_id: bomId, quantity_needed: qty })
      setEditingQty((prev) => { const next = { ...prev }; delete next[bomId]; return next })
    })
  }

  function handleDeleteBOM(bomId: string) {
    startTransition(async () => {
      await deleteBOMEntry(bomId)
    })
  }

  function handleReceive() {
    if (!receiveFor || !receiveFor.raw_material_id) return
    const qty = parseFloat(receiveQty.replace(',', '.'))
    if (isNaN(qty) || qty <= 0) { setReceiveError('Informe uma quantidade válida'); return }
    setReceiveError('')
    startTransition(async () => {
      const res = await receivePurchaseRequest({
        purchase_request_id: receiveFor.id,
        raw_material_id: receiveFor.raw_material_id!,
        quantity_received: qty,
      })
      if (res.success) {
        setReceiveFor(null)
      } else {
        setReceiveError(res.error)
      }
    })
  }

  function handleCancel(id: string) {
    startTransition(async () => { await cancelPurchaseRequest(id) })
  }

  function handleCategoryChange(cat: string) {
    setNewCategory(cat)
    const tipos = TIPOS[cat as Category] ?? []
    setNewTipo(tipos[0] ?? '')
    setNewColor('')
  }

  function handleExit() {
    if (!exitFor) return
    const qty = parseFloat(exitQty.replace(',', '.'))
    if (isNaN(qty) || qty <= 0) { setExitError('Informe uma quantidade válida'); return }
    setExitError('')
    startTransition(async () => {
      const res = await registerMaterialExit({
        material_id: exitFor.id,
        quantity: qty,
        reason: exitReason,
        notes: exitNotes || null,
      })
      if (res.success) {
        setExitFor(null)
        setExitQty('1')
        setExitNotes('')
      } else {
        setExitError(res.error)
      }
    })
  }

  function openNewMaterial() {
    setShowNewMaterial(true)
    setNewName(''); setNewCategory(CATEGORIES[0])
    setNewTipo(TIPOS[CATEGORIES[0]]?.[0] ?? '')
    setNewColor('')
    setNewUnit('unidade'); setNewStock('0'); setNewMinStock('0')
    setNewCost(''); setNewSupplierId(''); setNewNotes(''); setNewError('')
  }

  function handleCreateMaterial() {
    if (!newName.trim()) { setNewError('Nome obrigatório'); return }
    const stockQty = parseFloat(newStock.replace(',', '.'))
    const minQty = parseFloat(newMinStock.replace(',', '.'))
    if (isNaN(stockQty) || stockQty < 0) { setNewError('Estoque inválido'); return }
    setNewError('')
    startTransition(async () => {
      const res = await createRawMaterial({
        name: newName.trim(),
        type: 'bruta',
        category: newCategory,
        subcategory: null,
        type_specific: newTipo || null,
        state: null,
        color: isCutCategory(newCategory) ? newColor.trim() || null : null,
        unit: newUnit,
        stock_quantity: stockQty,
        minimum_stock: isNaN(minQty) ? 0 : minQty,
        cost_per_unit: newCost ? parseFloat(newCost.replace(',', '.')) : null,
        supplier: suppliers.find((s) => s.id === newSupplierId)?.name ?? null,
        supplier_id: newSupplierId || null,
        notes: newNotes.trim() || null,
      })
      if (res.success) {
        setShowNewMaterial(false)
        setNewTipo(TIPOS[CATEGORIES[0]]?.[0] ?? '')
        setNewColor('')
      } else {
        setNewError(res.error)
      }
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Matérias-Primas</h2>
          <p className="page-sub">
            {materials.length} insumo{materials.length !== 1 ? 's' : ''} cadastrado{materials.length !== 1 ? 's' : ''} · {lowCount} abaixo do mínimo
          </p>
        </div>
        <div className="page-actions">
          <button className="btn primary" id="btn-nova-materia" onClick={openNewMaterial}>
            <AdminIcon name="plus" /> Nova matéria-prima
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'insumos' ? 'active' : ''}`} onClick={() => setTab('insumos')}>
          <AdminIcon name="layers" size={13} /> Insumos <span className="count">{materials.length}</span>
        </button>
        <button className={`tab ${tab === 'receitas' ? 'active' : ''}`} onClick={() => setTab('receitas')}>
          <AdminIcon name="fileText" size={13} /> Receitas
        </button>
        <button className={`tab ${tab === 'compras' ? 'active' : ''}`} onClick={() => setTab('compras')}>
          <AdminIcon name="money" size={13} />
          {purchaseRequests.length > 0 && tab !== 'compras' ? 'Compras pendentes' : 'Compras'}
          {purchaseRequests.length > 0 && tab !== 'compras' && (
            <span className="count alert">{purchaseRequests.length}</span>
          )}
        </button>
      </div>

      {tab === 'insumos' && (
        <div className="card">
          <div className="card-header" style={{ gap: 12 }}>
            <h3 className="ttl">Insumos</h3>
            <div className="row" style={{ flex: 1, gap: 8, justifyContent: 'flex-end' }}>
              <div className="search-input" style={{ width: 220 }}>
                <AdminIcon name="search" size={13} />
                <input
                  placeholder="Buscar matéria-prima..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="select" style={{ width: 'auto' }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">Todas as categorias</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="chip">{filteredMaterials.length} insumo{filteredMaterials.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th style={{ width: 50 }}>Tipo</th>
                    <th style={{ width: 60 }}>Un.</th>
                    <th style={{ width: 90 }}>Atual</th>
                    <th style={{ width: 70 }}>Mín.</th>
                    <th style={{ width: 90 }}>Custo/un.</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                        Nenhum insumo encontrado.
                      </td>
                    </tr>
                  )}
                  {filteredMaterials.map((m) => {
                    const s = stockState(m.stock_quantity, m.minimum_stock)
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="row" style={{ gap: 8 }}>
                            <div className="thumb mat" style={{ width: 22, height: 22 }}>
                              <AdminIcon name="layers" size={11} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <span style={{ fontWeight: 500, fontSize: 12.5 }}>{m.name}</span>
                              <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                                <span className="cust-meta" style={{ fontSize: 11 }}>
                                  {[m.category, m.type_specific, m.state].filter(Boolean).join(' › ')}
                                </span>
                                {s.badge}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="cust-meta" style={{ fontSize: 11 }}>
                          {m.type === 'intermediaria' ? 'Inter.' : 'Bruta'}
                        </td>
                        <td className="cust-meta">{m.unit}</td>
                        <td className="num">
                          <span className={`stock-num ${s.cls}`}>
                            {m.stock_quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                          </span>
                        </td>
                        <td className="num cust-meta">
                          {m.minimum_stock.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                        </td>
                        <td className="num cust-meta">
                          {m.cost_per_unit != null
                            ? `R$ ${m.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td>
                          <div className="row" style={{ justifyContent: 'flex-end', gap: 2 }}>
                            <button
                              className="btn sm primary"
                              id={`btn-entrada-${m.id}`}
                              onClick={() => {
                                setEntryFor(m)
                                setEntryQty('1')
                                setEntryReason('compra')
                                setEntryNotes('')
                                setEntryError('')
                              }}
                            >
                              <AdminIcon name="plus" size={11} /> Entrada
                            </button>
                            <button
                              className="btn sm ghost"
                              onClick={() => { setExitFor(m); setExitQty('1'); setExitNotes(''); setExitError('') }}
                              title="Registrar saída"
                              data-testid={`btn-exit-${m.id}`}
                            >
                              <AdminIcon name="minus" size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'receitas' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="ttl">Receita de Produto (BOM)</h3>
              <div className="cust-meta" style={{ marginTop: 2, fontSize: 11.5 }}>
                Consumo de matéria-prima por unidade fabricada.
              </div>
            </div>
            {selectedProduct && (
              <button
                className={`btn sm ${bomEditMode ? '' : 'ghost'}`}
                style={bomEditMode ? { background: 'var(--accent)', color: '#fff', border: 'none' } : {}}
                onClick={() => {
                  setBomEditMode((v) => !v)
                  setBomError('')
                  setEditingQty({})
                  if (availableMaterials.length > 0) setAddMaterialId(availableMaterials[0].id)
                }}
              >
                <AdminIcon name={bomEditMode ? 'check' : 'edit'} size={11} />
                {bomEditMode ? 'Concluir' : 'Editar'}
              </button>
            )}
          </div>

          {/* Seletor de variante */}
          <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="field">
              <label>Variante de produto</label>
              <select
                className="select"
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value)
                  setBomEditMode(false)
                  setBomError('')
                  setEditingQty({})
                }}
              >
                <option value="">— Selecionar produto —</option>
                {productsWithBOM.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.variant_count} {p.variant_count === 1 ? 'variante' : 'variantes'})
                  </option>
                ))}
                {products
                  .filter((p) => p.bom.length === 0)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (sem receita)</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tabela de ingredientes */}
          <div className="card-body flush">
            {!selectedProduct || (selectedProduct.bom.length === 0 && !bomEditMode) ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                {selectedProduct
                  ? <><span>Nenhuma receita cadastrada.</span><br /><button className="linkish" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setBomEditMode(true)}>+ Adicionar ingredientes</button></>
                  : 'Selecione uma variante acima.'}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th style={{ width: 90 }}>Qtd. / un.</th>
                      <th style={{ width: 60 }}>Un.</th>
                      <th style={{ width: 70 }}>Estoque</th>
                      {bomEditMode && <th style={{ width: 32 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.bom.map((b) => {
                      const s = stockState(b.material.stock_quantity, 0)
                      const isEditing = bomEditMode && editingQty[b.id] !== undefined
                      return (
                        <tr key={b.id}>
                          <td>
                            <div className="row" style={{ gap: 8 }}>
                              <div className="thumb mat" style={{ width: 22, height: 22 }}>
                                <AdminIcon name="layers" size={11} />
                              </div>
                              <div>
                                <div style={{ fontSize: 12.5 }}>{b.material.name}</div>
                                <div className="cust-meta" style={{ fontSize: 11 }}>
                                  {b.material_category}
                                  {b.is_cut && ' · cor definida na variante'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="num" style={{ fontWeight: 500 }}>
                            {bomEditMode ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                                <input
                                  className="input"
                                  style={{ width: 60, textAlign: 'right', padding: '3px 6px', fontSize: 12 }}
                                  value={isEditing ? editingQty[b.id] : b.quantity_needed.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                  onFocus={() => setEditingQty((prev) => ({ ...prev, [b.id]: b.quantity_needed.toString() }))}
                                  onChange={(e) => setEditingQty((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                  onBlur={() => handleUpdateBOM(b.id)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateBOM(b.id) }}
                                />
                              </div>
                            ) : (
                              b.quantity_needed.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                            )}
                          </td>
                          <td className="cust-meta">{b.material.unit}</td>
                          <td className="num">
                            <span className={`stock-num ${s.cls}`} style={{ fontSize: 11.5 }}>
                              {b.material.stock_quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                            </span>
                          </td>
                          {bomEditMode && (
                            <td>
                              <button
                                className="icon-btn"
                                title="Remover da receita"
                                onClick={() => handleDeleteBOM(b.id)}
                                disabled={isPending}
                              >
                                <AdminIcon name="x" size={12} />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}

                    {/* Linha para adicionar novo ingrediente (apenas no modo edição) */}
                    {bomEditMode && availableMaterials.length > 0 && (
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td colSpan={bomEditMode ? 5 : 4} style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px auto', gap: 6, alignItems: 'center' }}>
                            <select
                              className="select"
                              style={{ fontSize: 12 }}
                              value={addMaterialId}
                              onChange={(e) => setAddMaterialId(e.target.value)}
                            >
                              {availableMaterials.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                            <input
                              className="input"
                              style={{ textAlign: 'right', padding: '5px 8px', fontSize: 12 }}
                              placeholder="Qtd."
                              value={addQty}
                              onChange={(e) => setAddQty(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddBOM() }}
                            />
                            <button
                              className="btn sm primary"
                              onClick={handleAddBOM}
                              disabled={isPending}
                            >
                              <AdminIcon name="plus" size={11} /> Add
                            </button>
                          </div>
                          {bomError && (
                            <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{bomError}</div>
                          )}
                        </td>
                      </tr>
                    )}

                    {bomEditMode && availableMaterials.length === 0 && selectedProduct.bom.length > 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span className="cust-meta" style={{ fontSize: 11 }}>Todos os insumos já foram adicionados.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedProduct && selectedProduct.bom.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div className="cust-meta tiny">
                Custo estimado / un.:{' '}
                <b style={{ color: 'var(--text)' }}>
                  {estimatedCost > 0
                    ? `R$ ${estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </b>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Compras Pendentes ── */}
      {tab === 'compras' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="ttl">Compras</h3>
              <div className="cust-meta" style={{ marginTop: 2, fontSize: 11.5 }}>
                Materiais registrados como necessários em pedidos de atacado.
              </div>
            </div>
          </div>
          {purchaseRequests.length === 0 ? (
            <div className="card-body" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
              Não tem nenhuma compra pendente nesse momento.
            </div>
          ) : (
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th style={{ width: 120 }}>Qtd. necessária</th>
                    <th style={{ width: 60 }}>Un.</th>
                    <th style={{ width: 100 }}>Pedido Atac.</th>
                    <th style={{ width: 90 }}>Registrado</th>
                    <th style={{ width: 130 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequests.map((pr) => (
                    <tr key={pr.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12.5 }}>{pr.material_name}</div>
                      </td>
                      <td className="num" style={{ fontWeight: 600, color: 'var(--red)' }}>
                        {pr.quantity_needed.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="cust-meta">{pr.unit}</td>
                      <td className="cust-meta">{pr.order_display_num ?? '—'}</td>
                      <td className="cust-meta">{pr.created_at}</td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            className="icon-btn"
                            title="Cancelar / descartar"
                            onClick={() => handleCancel(pr.id)}
                            disabled={isPending}
                          >
                            <AdminIcon name="x" size={12} />
                          </button>
                          {pr.raw_material_id ? (
                            <button
                              className="btn sm primary"
                              id={`btn-receber-${pr.id}`}
                              onClick={() => {
                                setReceiveFor(pr)
                                setReceiveQty(pr.quantity_needed.toLocaleString('pt-BR', { maximumFractionDigits: 3 }))
                                setReceiveError('')
                              }}
                            >
                              <AdminIcon name="plus" size={11} /> Receber
                            </button>
                          ) : (
                            <span className="cust-meta" style={{ fontSize: 11 }}>MP removida</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ── Modal de entrada de estoque ── */}
      {entryFor && (
        <div className="modal-backdrop" onClick={() => setEntryFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Entrada de Estoque</h3>
                <div className="sub">
                  {entryFor.name} · estoque atual {formatQty(entryFor.stock_quantity, entryFor.unit)}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setEntryFor(null)}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label>Quantidade a adicionar</label>
                    <div style={{ display: 'flex' }}>
                      <input
                        className="input"
                        value={entryQty}
                        onChange={(e) => setEntryQty(e.target.value)}
                        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      />
                      <span style={{
                        display: 'grid', placeItems: 'center', background: 'var(--surface-2)',
                        border: '1px solid var(--border-input)', borderLeft: 'none', padding: '0 12px',
                        borderTopRightRadius: 6, borderBottomRightRadius: 6, color: 'var(--text-2)',
                        fontSize: 12, whiteSpace: 'nowrap',
                      }}>
                        {entryFor.unit}
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Motivo</label>
                    <select
                      className="select"
                      value={entryReason}
                      onChange={(e) => setEntryReason(e.target.value as 'compra' | 'ajuste' | 'devolucao')}
                    >
                      <option value="compra">Compra</option>
                      <option value="ajuste">Ajuste de inventário</option>
                      <option value="devolucao">Devolução</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Observações</label>
                  <textarea
                    className="input"
                    rows={2}
                    style={{ height: 'auto', padding: 8, resize: 'vertical' }}
                    placeholder="Opcional..."
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                  />
                </div>
                {(() => {
                  const qty = parseFloat(entryQty.replace(',', '.'))
                  const newStock = isNaN(qty) ? entryFor.stock_quantity : entryFor.stock_quantity + qty
                  return (
                    <div style={{
                      background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-2)',
                      borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#7a4a36',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <AdminIcon name="info" size={14} />
                      Após confirmar, o estoque passa para{' '}
                      <b>{formatQty(newStock, entryFor.unit)}</b>.
                    </div>
                  )
                })()}
                {entryError && (
                  <div style={{ color: 'var(--red)', fontSize: 12 }}>{entryError}</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setEntryFor(null)}>Cancelar</button>
              <button
                className="btn primary"
                id="btn-confirmar-entrada"
                onClick={handleEntry}
                disabled={isPending}
              >
                <AdminIcon name="check" size={12} />
                {isPending ? 'Salvando...' : 'Confirmar entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nova matéria-prima ── */}
      {showNewMaterial && (
        <div className="modal-backdrop" onClick={() => setShowNewMaterial(false)}>
          <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Nova Matéria-Prima</h3>
                <div className="sub">Cadastre um insumo para usar em receitas e ordens de produção</div>
              </div>
              <button className="icon-btn" onClick={() => setShowNewMaterial(false)}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label>Nome *</label>
                  <input className="input" placeholder="Ex: Couro Vaqueta Caramelo" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>

                <div className="field">
                  <label>Unidade</label>
                  <select className="select" value={newUnit} onChange={(e) => setNewUnit(e.target.value as typeof newUnit)}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label>Categoria</label>
                  <select className="select" value={newCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Tipo — dropdown com opções específicas por categoria */}
                <div className="field">
                  <label>Tipo</label>
                  <select
                    id="new-material-tipo"
                    className="select"
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                  >
                    {TIPOS[newCategory as Category].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Cor — só nos cortes: é ela que casa o insumo com a variante */}
                {isCutCategory(newCategory) && (
                  <div className="field">
                    <label>Cor</label>
                    <input
                      id="new-material-cor"
                      className="input"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="Ex: Mostarda"
                      list="cores-cadastradas"
                    />
                    <datalist id="cores-cadastradas">
                      {knownColors.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <span className="cust-meta tiny">
                      Precisa bater com a cor de {newCategory.replace('Corte ', '').toLowerCase()} definida na variante do produto.
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label>Estoque inicial</label>
                    <input className="input" value={newStock} onChange={(e) => setNewStock(e.target.value)} placeholder="0" />
                  </div>
                  <div className="field">
                    <label>Estoque mínimo</label>
                    <input className="input" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} placeholder="0" />
                  </div>
                  <div className="field">
                    <label>Custo / unidade</label>
                    <input className="input" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="R$ 0,00" />
                  </div>
                </div>

                <div className="field">
                  <label>Fornecedor (opcional)</label>
                  <select
                    id="new-material-fornecedor"
                    className="select"
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(e.target.value)}
                  >
                    <option value="">— Sem fornecedor —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {suppliers.length === 0 && (
                    <span className="cust-meta" style={{ fontSize: 11, marginTop: 4 }}>
                      Nenhum fornecedor cadastrado. Cadastre em{' '}
                      <a href="/admin/fornecedores" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Fornecedores</a>.
                    </span>
                  )}
                </div>

                <div className="field">
                  <label>Observações (opcional)</label>
                  <textarea className="input" rows={2} style={{ height: 'auto', padding: 8, resize: 'vertical' }} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Detalhes, referências, etc." />
                </div>

                {newError && <div style={{ color: 'var(--red)', fontSize: 12 }}>{newError}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowNewMaterial(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleCreateMaterial} disabled={isPending}>
                <AdminIcon name="plus" size={12} />
                {isPending ? 'Salvando...' : 'Cadastrar matéria-prima'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de saída de estoque ── */}
      {exitFor && (
        <div className="modal-backdrop" onClick={() => setExitFor(null)}>
          <div className="modal" id="exit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Registrar Saída</h3>
                <div className="sub">
                  {exitFor.name} · estoque atual {formatQty(exitFor.stock_quantity, exitFor.unit)}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setExitFor(null)}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label>Quantidade a retirar</label>
                    <div style={{ display: 'flex' }}>
                      <input
                        id="exit-qty"
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="input"
                        value={exitQty}
                        onChange={(e) => setExitQty(e.target.value)}
                        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      />
                      <span style={{
                        display: 'grid', placeItems: 'center', background: 'var(--surface-2)',
                        border: '1px solid var(--border-input)', borderLeft: 'none', padding: '0 12px',
                        borderTopRightRadius: 6, borderBottomRightRadius: 6, color: 'var(--text-2)',
                        fontSize: 12, whiteSpace: 'nowrap',
                      }}>
                        {exitFor.unit}
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Motivo</label>
                    <select
                      id="exit-reason"
                      className="select"
                      value={exitReason}
                      onChange={(e) => setExitReason(e.target.value as typeof exitReason)}
                    >
                      <option value="ajuste">Ajuste de inventário</option>
                      <option value="perda">Perda / descarte</option>
                      <option value="uso_manual">Uso avulso</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Observações (opcional)</label>
                  <input
                    id="exit-notes"
                    type="text"
                    className="input"
                    value={exitNotes}
                    onChange={(e) => setExitNotes(e.target.value)}
                  />
                </div>
                {exitError && (
                  <div style={{ color: 'var(--red)', fontSize: 12 }}>{exitError}</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setExitFor(null)}>Cancelar</button>
              <button
                id="btn-confirmar-saida"
                className="btn danger"
                disabled={isPending}
                onClick={handleExit}
              >
                {isPending ? 'Salvando...' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de recebimento de compra ── */}
      {receiveFor && (
        <div className="modal-backdrop" onClick={() => setReceiveFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Confirmar Recebimento</h3>
                <div className="sub">
                  {receiveFor.material_name} · pedido: {formatQty(receiveFor.quantity_needed, receiveFor.unit)}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setReceiveFor(null)}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label>Quantidade efetivamente recebida</label>
                  <div style={{ display: 'flex' }}>
                    <input
                      className="input"
                      value={receiveQty}
                      onChange={(e) => setReceiveQty(e.target.value)}
                      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                    />
                    <span style={{
                      display: 'grid', placeItems: 'center', background: 'var(--surface-2)',
                      border: '1px solid var(--border-input)', borderLeft: 'none', padding: '0 12px',
                      borderTopRightRadius: 6, borderBottomRightRadius: 6, color: 'var(--text-2)',
                      fontSize: 12, whiteSpace: 'nowrap',
                    }}>
                      {receiveFor.unit}
                    </span>
                  </div>
                </div>
                <div style={{
                  background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-2)',
                  borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#7a4a36',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AdminIcon name="info" size={14} />
                  Confirmar adiciona ao estoque de <b>{receiveFor.material_name}</b> e marca a compra como recebida.
                </div>
                {receiveError && (
                  <div style={{ color: 'var(--red)', fontSize: 12 }}>{receiveError}</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setReceiveFor(null)}>Cancelar</button>
              <button
                className="btn primary"
                id="btn-confirmar-recebimento"
                onClick={handleReceive}
                disabled={isPending}
              >
                <AdminIcon name="check" size={12} />
                {isPending ? 'Salvando...' : 'Confirmar recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
