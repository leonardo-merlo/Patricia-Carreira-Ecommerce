"use client" // expanded rows + drawer state

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import type { ProductWithVariants, ProductVariant } from '@/lib/types'

interface EstoqueClientProps {
  products: ProductWithVariants[]
}

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    bolsas: 'Bolsas',
    roupas: 'Roupas',
    acessorios: 'Acessórios',
    bazar: 'Bazar',
  }
  return map[cat] ?? cat
}

function getThumbClass(cat: string): string {
  if (cat === 'bolsas') return 'bag'
  if (cat === 'roupas') return 'cloth'
  return 'acc'
}

function getThumbIcon(cat: string): 'bag' | 'tag' | 'sparkles' {
  if (cat === 'bolsas' || cat === 'bazar') return 'bag'
  if (cat === 'roupas') return 'tag'
  return 'sparkles'
}

function stockBadge(qty: number) {
  if (qty === 0) return <span className="badge esgotado"><AdminIcon name="xCircle" size={11} /> Esgotado</span>
  if (qty <= 3) return <span className="badge baixo"><AdminIcon name="alert" size={11} /> Baixo</span>
  return <span className="stock-num ok">{qty}</span>
}

export function EstoqueClient({ products }: EstoqueClientProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [drawerProduct, setDrawerProduct] = useState<ProductWithVariants | null>(null)

  const totalVariants = products.reduce((a, p) => a + p.variants.length, 0)

  function toggle(id: string) {
    const s = new Set(expanded)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpanded(s)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Gestão de Estoque</h2>
          <p className="page-sub">{products.length} produtos · {totalVariants} variantes</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-novo-produto"><AdminIcon name="plus" /> Novo produto</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 12 }}>
          <div className="row" style={{ flex: 1, gap: 8 }}>
            <div className="search-input" style={{ width: 280 }}>
              <AdminIcon name="search" size={13} />
              <input placeholder="Buscar por nome ou SKU..." />
            </div>
            <select className="select" style={{ width: 'auto' }}>
              <option>Todas as categorias</option>
              <option>Bolsas</option>
              <option>Roupas</option>
              <option>Acessórios</option>
              <option>Bazar</option>
            </select>
            <select className="select" style={{ width: 'auto' }}>
              <option>Todos os status</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>
          <span className="chip">{products.length} produtos</span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Produto</th>
                  <th style={{ width: 110 }}>Categoria</th>
                  <th style={{ width: 110 }}>Variantes</th>
                  <th style={{ width: 110 }}>Preço varejo</th>
                  <th style={{ width: 110 }}>Atacado</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 100 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-3)' }}>
                      Nenhum produto cadastrado.
                    </td>
                  </tr>
                ) : products.map((p) => (
                  <>
                    <tr key={`prod-${p.id}`} className={expanded.has(p.id) ? 'expanded' : ''}>
                      <td>
                        <button className="icon-btn" onClick={() => toggle(p.id)} aria-label="Expandir">
                          <AdminIcon name={expanded.has(p.id) ? 'chevDown' : 'chevRight'} size={12} />
                        </button>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <div className={`thumb ${getThumbClass(p.category)}`}>
                            <AdminIcon name={getThumbIcon(p.category)} size={14} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{p.name}</div>
                            <div className="cust-meta">
                              {p.variants.length} {p.variants.length === 1 ? 'variante' : 'variantes'} ·{' '}
                              {p.variants.reduce((a, v) => a + v.stock_quantity, 0)} unid.
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{getCategoryLabel(p.category)}</span></td>
                      <td className="num">{p.variants.length}</td>
                      <td className="num">{formatPrice(p.base_price)}</td>
                      <td className="num subtle">
                        {p.wholesale_price ? formatPrice(p.wholesale_price) : '—'}
                      </td>
                      <td>
                        <span className={`switch ${p.is_active ? 'on' : ''}`} />
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                          <button className="icon-btn" onClick={() => setDrawerProduct(p)} title="Editar">
                            <AdminIcon name="edit" size={13} />
                          </button>
                          <button className="icon-btn" title="Mais">
                            <AdminIcon name="moreH" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded.has(p.id) && p.variants.map((v: ProductVariant) => (
                      <tr className="child" key={`var-${v.id}`}>
                        <td></td>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-3)' }}>
                              {v.sku}
                            </span>
                            {v.color && <span style={{ color: 'var(--text)' }}>{v.color}</span>}
                          </div>
                        </td>
                        <td className="cust-meta">{v.size ? `Tamanho ${v.size}` : 'Único'}</td>
                        <td className="num">{stockBadge(v.stock_quantity)}</td>
                        <td colSpan={2} className="cust-meta">SKU: {v.sku}</td>
                        <td></td>
                        <td>
                          <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                            <button className="btn sm ghost"><AdminIcon name="plus" size={11} /> Estoque</button>
                            <button className="btn sm ghost">Editar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`drawer-backdrop ${drawerProduct ? 'open' : ''}`} onClick={() => setDrawerProduct(null)} />
      <div className={`drawer ${drawerProduct ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <h3>Editar produto</h3>
            <div className="cust-meta">{drawerProduct?.name}</div>
          </div>
          <button className="icon-btn" onClick={() => setDrawerProduct(null)}>
            <AdminIcon name="x" size={14} />
          </button>
        </div>
        <div className="drawer-body">
          <div style={{
            border: '1.5px dashed var(--border-strong)',
            borderRadius: 8,
            background: 'var(--surface-2)',
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--text-2)',
            marginBottom: 18,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 8, margin: '0 auto 8px',
              background: 'linear-gradient(135deg,#d4b29a,#a87b5e)',
              display: 'grid', placeItems: 'center', color: '#fff',
            }}>
              <AdminIcon name="image" size={20} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Arraste imagens ou clique</div>
            <div className="cust-meta">PNG, JPG até 4MB · Recomendado 1200×1200</div>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="field">
              <label>Nome do produto</label>
              <input className="input" defaultValue={drawerProduct?.name ?? ''} />
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea
                className="input"
                rows={3}
                style={{ height: 'auto', padding: 8, resize: 'vertical' }}
                defaultValue={drawerProduct?.description ?? ''}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Preço varejo</label>
                <input className="input" defaultValue={drawerProduct ? formatPrice(drawerProduct.base_price) : ''} />
              </div>
              <div className="field">
                <label>Preço atacado</label>
                <input className="input" defaultValue={drawerProduct?.wholesale_price ? formatPrice(drawerProduct.wholesale_price) : ''} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Categoria</label>
                <select className="select" defaultValue={drawerProduct?.category ?? 'bolsas'}>
                  <option value="bolsas">Bolsas</option>
                  <option value="roupas">Roupas</option>
                  <option value="acessorios">Acessórios</option>
                  <option value="bazar">Bazar</option>
                </select>
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 8,
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 12.5 }}>Ativo no e-commerce</div>
                <div className="cust-meta">Visível na loja online</div>
              </div>
              <span className={`switch ${drawerProduct?.is_active ? 'on' : ''}`} />
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn ghost" onClick={() => setDrawerProduct(null)}>Cancelar</button>
          <button className="btn primary" id="btn-salvar-produto">Salvar alterações</button>
        </div>
      </div>
    </div>
  )
}
