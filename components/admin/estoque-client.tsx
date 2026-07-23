"use client"

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import { toggleProductStatus } from '@/lib/actions/products'
import { ProdutoModal, AdjustStockModal, type AdjustStockTarget } from '@/components/admin/produto-modal'
import { CsvImportModal } from '@/components/admin/csv-import-modal'
import { toCsv, downloadCsv } from '@/lib/csv'
import type { ProductVariant } from '@/lib/types'
import type { ProductWithVariantsAndBom, RawMaterialRow } from '@/lib/supabase/admin-queries'

const EXPORT_HEADERS = [
  'sku', 'nome_produto', 'descricao', 'categoria', 'subcategoria', 'cor', 'tamanho',
  'estoque', 'preco_varejo', 'preco_atacado', 'ativo_ecommerce', 'destaque_home', 'tags',
  'peso_g', 'comprimento_cm', 'largura_cm', 'altura_cm',
]

function priceCell(n: number | null): string {
  return n == null ? '' : n.toFixed(2).replace('.', ',')
}

function exportEstoqueCsv(products: ProductWithVariantsAndBom[]): void {
  const rows = products.flatMap((p) =>
    p.variants.map((v) => [
      v.sku,
      p.name,
      p.description ?? '',
      p.category,
      p.subcategory ?? '',
      v.color ?? '',
      v.size ?? '',
      v.stock_quantity,
      priceCell(p.base_price),
      priceCell(p.wholesale_price),
      p.is_active ? 'TRUE' : 'FALSE',
      p.is_featured ? 'TRUE' : 'FALSE',
      (p.tags ?? []).join('|'),
      p.weight_grams ?? '',
      p.length_cm ?? '',
      p.width_cm ?? '',
      p.height_cm ?? '',
    ]),
  )
  const csv = toCsv(EXPORT_HEADERS, rows)
  downloadCsv(`estoque-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}

interface EstoqueClientProps {
  products: ProductWithVariantsAndBom[]
  rawMaterials: RawMaterialRow[]
}

function getCategoryLabel(cat: string): string {
  return { bolsas: 'Bolsas', roupas: 'Roupas', acessorios: 'Acessórios', bazar: 'Bazar' }[cat] ?? cat
}

function getThumb(cat: string) {
  if (cat === 'bolsas' || cat === 'bazar') return { cls: 'bag', icon: 'bag' as const }
  if (cat === 'roupas') return { cls: 'cloth', icon: 'tag' as const }
  return { cls: 'acc', icon: 'sparkles' as const }
}

function stockBadge(qty: number) {
  if (qty === 0) return <span className="badge esgotado"><AdminIcon name="xCircle" size={11} /> Esgotado</span>
  if (qty <= 3) return <span className="badge baixo"><AdminIcon name="alert" size={11} /> {qty}</span>
  return <span className="stock-num ok">{qty}</span>
}

function variantLabel(v: ProductVariant): string {
  const hasSize = v.size && v.size !== 'Único'
  if (v.color && hasSize) return `${v.color} — ${v.size}`
  if (v.color) return v.color
  if (hasSize) return v.size!
  return v.sku
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EstoqueClient({ products, rawMaterials }: EstoqueClientProps) {
  const router = useRouter()

  // Filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Table state
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Status toggle optimistic
  const [statusOverrides, setStatusOverrides] = useState<Map<string, boolean>>(new Map())

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductWithVariantsAndBom | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<AdjustStockTarget | null>(null)
  const [showCsvImport, setShowCsvImport] = useState(false)


  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    if (catFilter !== 'all' && p.category !== catFilter) return false
    const isActive = statusOverrides.has(p.id) ? statusOverrides.get(p.id)! : p.is_active
    if (statusFilter === 'active' && !isActive) return false
    if (statusFilter === 'inactive' && isActive) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = p.name.toLowerCase().includes(q)
      const matchSku = p.variants.some((v) => v.sku.toLowerCase().includes(q))
      if (!matchName && !matchSku) return false
    }
    return true
  })

  const totalVariants = filtered.reduce((a, p) => a + p.variants.length, 0)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleToggle(productId: string, current: boolean) {
    const next = !current
    setStatusOverrides((m) => new Map(m).set(productId, next))
    try {
      await toggleProductStatus(productId, next)
      router.refresh()
    } catch {
      setStatusOverrides((m) => { const n = new Map(m); n.delete(productId); return n })
    }
  }

  function toggle(id: string) {
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      {/* Modais */}
      {showCreateModal && <ProdutoModal mode="create" rawMaterials={rawMaterials} onClose={() => setShowCreateModal(false)} />}
      {editProduct && <ProdutoModal mode="edit" product={editProduct} rawMaterials={rawMaterials} onClose={() => setEditProduct(null)} />}
      {adjustTarget && <AdjustStockModal target={adjustTarget} onClose={() => setAdjustTarget(null)} />}
      {showCsvImport && <CsvImportModal products={products} onClose={() => setShowCsvImport(false)} />}

      <div className="page-header">
        <div>
          <h2 className="page-title">Gestão de Estoque</h2>
          <p className="page-sub">{filtered.length} produtos · {totalVariants} variantes</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => exportEstoqueCsv(filtered)}>
            <AdminIcon name="download" /> Exportar
          </button>
          <button className="btn" id="btn-importar-csv" onClick={() => setShowCsvImport(true)}>
            <AdminIcon name="upload" /> Importar CSV
          </button>
          <button className="btn primary" id="btn-novo-produto" onClick={() => setShowCreateModal(true)}>
            <AdminIcon name="plus" /> Novo produto
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="card-header" style={{ gap: 12 }}>
          <div className="row" style={{ flex: 1, gap: 8 }}>
            <div className="search-input" style={{ width: 280 }}>
              <AdminIcon name="search" size={13} />
              <input
                placeholder="Buscar por nome ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="select" style={{ width: 'auto' }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">Todas as categorias</option>
              <option value="bolsas">Bolsas</option>
              <option value="roupas">Roupas</option>
              <option value="acessorios">Acessórios</option>
              <option value="bazar">Bazar</option>
            </select>
            <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <span className="chip">{filtered.length} produto{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Produto</th>
                  <th style={{ width: 110 }}>Categoria</th>
                  <th style={{ width: 100 }}>Estoque</th>
                  <th style={{ width: 110 }}>Preço varejo</th>
                  <th style={{ width: 110 }}>Atacado</th>
                  <th style={{ width: 80 }}>Status</th>
                  <th style={{ width: 80 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)' }}>
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : filtered.map((p) => {
                  const isActive = statusOverrides.has(p.id) ? statusOverrides.get(p.id)! : p.is_active
                  const totalStock = p.variants.reduce((a, v) => a + v.stock_quantity, 0)
                  const { cls, icon } = getThumb(p.category)
                  const isExpanded = expanded.has(p.id)

                  return (
                    <Fragment key={p.id}>
                      {/* Product row */}
                      <tr className={isExpanded ? 'expanded' : ''}>
                        <td>
                          <button className="icon-btn" onClick={() => toggle(p.id)} aria-label="Expandir variantes">
                            <AdminIcon name={isExpanded ? 'chevDown' : 'chevRight'} size={12} />
                          </button>
                        </td>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <div className={`thumb ${cls}`}>
                              <AdminIcon name={icon} size={14} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                              <div className="cust-meta">
                                {p.variants.length} variante{p.variants.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="chip">{getCategoryLabel(p.category)}</span></td>
                        <td className="num">
                          <div style={{ fontWeight: 500 }}>{totalStock}</div>
                          <div className="cust-meta">unid.</div>
                        </td>
                        <td className="num">{formatPrice(p.base_price)}</td>
                        <td className="num subtle">{p.wholesale_price ? formatPrice(p.wholesale_price) : '—'}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggle(p.id, isActive)}
                            className={`switch ${isActive ? 'on' : ''}`}
                            title={isActive ? 'Ativo — clique para arquivar' : 'Inativo — clique para ativar'}
                          />
                        </td>
                        <td>
                          <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                            <button className="icon-btn" title="Editar" onClick={() => setEditProduct(p)}>
                              <AdminIcon name="edit" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Variant rows */}
                      {isExpanded && p.variants.map((v: ProductVariant) => (
                        <tr className="child" key={v.id}>
                          <td></td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 12.5 }}>{variantLabel(v)}</div>
                              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: 'var(--text-3)' }}>{v.sku}</div>
                            </div>
                          </td>
                          <td></td>
                          <td className="num">{stockBadge(v.stock_quantity)}</td>
                          <td className="num subtle">{formatPrice(p.base_price)}</td>
                          <td className="num subtle">{p.wholesale_price ? formatPrice(p.wholesale_price) : '—'}</td>
                          <td></td>
                          <td>
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              <button
                                className="icon-btn"
                                title="Ajustar estoque"
                                onClick={() => setAdjustTarget({ variantId: v.id, sku: v.sku, currentStock: v.stock_quantity })}
                              >
                                <AdminIcon name="edit" size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

