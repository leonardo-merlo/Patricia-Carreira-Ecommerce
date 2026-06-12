"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  adjustVariantStock,
  type CreateProductInput,
  type UpdateProductData,
} from '@/lib/actions/products'
import { type ProductWithVariants, MANUAL_TAGS } from '@/lib/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugifyShort(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.slice(0, 4).toUpperCase())
    .join('-')
}

function buildSku(name: string, color: string, size: string): string {
  const base = slugifyShort(name)
  const c = (color || 'X').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').slice(0, 3).toUpperCase()
  const s = (size || 'U').replace(/\s+/g, '').slice(0, 3).toUpperCase()
  return `${base}-${c}-${s}`
}

type VariantRow = { tempId: string; color: string; size: string; sku: string; stock: string }

function emptyVariant(): VariantRow {
  return { tempId: `${Date.now()}-${Math.random()}`, color: '', size: 'Único', sku: '', stock: '0' }
}

// ─── ProdutoDrawer ────────────────────────────────────────────────────────────

interface ProdutoDrawerProps {
  mode: 'create' | 'edit'
  product?: ProductWithVariants
  onClose: () => void
}

export function ProdutoDrawer({ mode, product, onClose }: ProdutoDrawerProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [basePrice, setBasePrice] = useState(product ? String(product.base_price) : '')
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesale_price ? String(product.wholesale_price) : '')
  const [category, setCategory] = useState<'bolsas' | 'roupas' | 'acessorios' | 'bazar'>(
    (product?.category as 'bolsas' | 'roupas' | 'acessorios' | 'bazar') ?? 'bolsas',
  )
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '')
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [tags, setTags] = useState<string[]>(product?.tags ?? [])

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>(product?.images ?? [])

  const [variants, setVariants] = useState<VariantRow[]>(
    mode === 'edit' && product
      ? product.variants.map((v) => ({ tempId: v.id, color: v.color ?? '', size: v.size ?? 'Único', sku: v.sku, stock: String(v.stock_quantity) }))
      : [emptyVariant()],
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setImageFiles((prev) => [...prev, ...list])
    list.forEach((f) => setImagePreviews((prev) => [...prev, URL.createObjectURL(f)]))
  }

  function removeImage(idx: number) {
    const existingCount = product?.images?.length ?? 0
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx))
    if (idx >= existingCount) {
      setImageFiles((prev) => prev.filter((_, i) => i !== idx - existingCount))
    }
  }

  function updateVariant(tempId: string, field: keyof VariantRow, value: string) {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.tempId !== tempId) return v
        const next = { ...v, [field]: value }
        if ((field === 'color' || field === 'size') && name.trim()) {
          next.sku = buildSku(name, next.color, next.size)
        }
        return next
      }),
    )
  }

  function addVariant() {
    const row = emptyVariant()
    if (name.trim()) row.sku = buildSku(name, '', 'Único')
    setVariants((prev) => [...prev, row])
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    const price = parseFloat(basePrice.replace(',', '.'))
    if (isNaN(price) || price <= 0) { setError('Preço varejo inválido.'); return }
    if (variants.some((v) => !v.sku.trim())) { setError('Todas as variantes precisam ter SKU.'); return }

    setSaving(true)
    setError(null)

    try {
      const uploadedUrls: string[] = []
      for (const file of imageFiles) {
        const fd = new FormData()
        fd.append('file', file)
        uploadedUrls.push(await uploadProductImage(fd))
      }

      const existingUrls = (product?.images ?? []).filter((u) => imagePreviews.includes(u))
      const finalImages = [...existingUrls, ...uploadedUrls]
      const wholesale = wholesalePrice ? parseFloat(wholesalePrice.replace(',', '.')) : null

      if (mode === 'create') {
        const input: CreateProductInput = {
          name: name.trim(),
          description: description.trim() || null,
          base_price: price,
          wholesale_price: wholesale,
          category,
          subcategory: category === 'roupas' && subcategory ? subcategory : null,
          is_active: isActive,
          images: finalImages,
          tags,
          variants: variants.map((v) => ({
            color: v.color.trim() || null,
            size: v.size.trim() || 'Único',
            sku: v.sku.trim(),
            stock_quantity: Math.max(0, parseInt(v.stock) || 0),
          })),
        }
        await createProduct(input)
      } else if (product) {
        const data: UpdateProductData = {
          name: name.trim(),
          description: description.trim() || null,
          base_price: price,
          wholesale_price: wholesale,
          category,
          subcategory: category === 'roupas' && subcategory ? subcategory : null,
          is_active: isActive,
          images: finalImages,
          tags,
        }
        await updateProduct(product.id, data)
      }

      router.refresh()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="drawer-backdrop open" onClick={onClose} />
      <div className="drawer open" style={{ width: 560 }}>
        <div className="drawer-header">
          <div>
            <h3>{mode === 'create' ? 'Novo produto' : 'Editar produto'}</h3>
            {product && <div className="cust-meta">{product.name}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><AdminIcon name="x" size={14} /></button>
        </div>

        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Images */}
          <div>
            <div
              style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 8, background: 'var(--surface-2)', padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
            >
              <AdminIcon name="upload" size={18} style={{ display: 'block', margin: '0 auto 6px', color: 'var(--text-2)' }} />
              <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Arraste imagens ou clique para selecionar</div>
              <div className="cust-meta" style={{ marginTop: 2 }}>JPG, PNG, WebP · máx 5 MB por imagem</div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
            {imagePreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {imagePreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                    <button
                      onClick={() => removeImage(i)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', color: '#fff', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}
                    >
                      <AdminIcon name="x" size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label>Nome do produto *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bolsa Tiracolo Margaridas" />
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea className="input" rows={3} style={{ height: 'auto', padding: 8, resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o produto…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Preço varejo (R$) *</label>
                <input className="input" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0,00" />
              </div>
              <div className="field">
                <label>Preço atacado (R$)</label>
                <input className="input" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Categoria *</label>
                <select className="select" value={category} onChange={(e) => { setCategory(e.target.value as 'bolsas' | 'roupas' | 'acessorios' | 'bazar'); setSubcategory('') }}>
                  <option value="bolsas">Bolsas</option>
                  <option value="roupas">Roupas</option>
                  <option value="acessorios">Acessórios</option>
                  <option value="bazar">Bazar</option>
                </select>
              </div>
              {category === 'roupas' && (
                <div className="field">
                  <label>Subcategoria</label>
                  <select className="select" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                    <option value="">Sem subcategoria</option>
                    <option value="vestidos">Vestidos</option>
                    <option value="batas">Batas</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 12.5 }}>Ativo no e-commerce</div>
                <div className="cust-meta">Visível na loja online</div>
              </div>
              <button type="button" onClick={() => setIsActive((v) => !v)} className={`switch ${isActive ? 'on' : ''}`} style={{ cursor: 'pointer' }} />
            </div>

            <div className="field">
              <label>Tags (rótulos na loja)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {MANUAL_TAGS.map((tag) => {
                  const on = tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`btn sm ${on ? 'primary' : 'ghost'}`}
                      aria-pressed={on}
                    >
                      {on && <AdminIcon name="check" size={11} />} {tag}
                    </button>
                  )
                })}
              </div>
              <div className="cust-meta" style={{ marginTop: 6 }}>
                Rótulos visuais no card do produto. &quot;Bazar&quot; aqui é só etiqueta — não muda a categoria. &quot;Esgotado&quot; e &quot;Última Peça&quot; continuam automáticos pelo estoque.
              </div>
            </div>
          </div>

          {/* Variants */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Variantes</div>
              <button className="btn sm primary" type="button" onClick={addVariant}><AdminIcon name="plus" size={11} /> Adicionar variante</button>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Cor</th>
                    <th>Tamanho</th>
                    <th>SKU *</th>
                    <th style={{ width: 70 }}>Estoque</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.tempId}>
                      <td style={{ padding: '6px 10px' }}>
                        <input className="input" style={{ height: 26, padding: '2px 8px' }} value={v.color} onChange={(e) => updateVariant(v.tempId, 'color', e.target.value)} placeholder="Marinho" />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input className="input" style={{ height: 26, padding: '2px 8px' }} value={v.size} onChange={(e) => updateVariant(v.tempId, 'size', e.target.value)} placeholder="Único / P / M / G" />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input className="input" style={{ height: 26, padding: '2px 8px', fontFamily: 'monospace', fontSize: 11 }} value={v.sku} onChange={(e) => updateVariant(v.tempId, 'sku', e.target.value)} placeholder="BOL-TIRA-MAR-UNI" />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input className="input" style={{ height: 26, padding: '2px 8px', width: 56 }} type="number" min="0" value={v.stock} onChange={(e) => updateVariant(v.tempId, 'stock', e.target.value)} />
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        {variants.length > 1 && (
                          <button className="icon-btn" type="button" onClick={() => setVariants((p) => p.filter((x) => x.tempId !== v.tempId))}>
                            <AdminIcon name="x" size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cust-meta" style={{ marginTop: 6 }}>SKU gerado automaticamente ao digitar cor e tamanho — edite se necessário.</div>
          </div>

          {error && (
            <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5 }}>
              {error}
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <button className="btn ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn primary" id="btn-salvar-produto" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando…' : mode === 'create' ? 'Criar produto' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── AdjustStockModal ─────────────────────────────────────────────────────────

export type AdjustStockTarget = { variantId: string; sku: string; currentStock: number }

interface AdjustStockModalProps {
  target: AdjustStockTarget
  onClose: () => void
}

export function AdjustStockModal({ target, onClose }: AdjustStockModalProps) {
  const router = useRouter()
  const [qty, setQty] = useState(String(target.currentStock))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const diff = parseInt(qty) - target.currentStock

  async function handleSave() {
    const newQty = parseInt(qty)
    if (isNaN(newQty) || newQty < 0) { setError('Quantidade inválida'); return }
    setSaving(true)
    try {
      await adjustVariantStock(target.variantId, newQty)
      router.refresh()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao ajustar estoque')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Ajustar estoque</h3>
            <div className="sub">{target.sku}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><AdminIcon name="x" size={14} /></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <div className="cust-meta">Atual: <b style={{ color: 'var(--text)' }}>{target.currentStock} unid.</b></div>
          <div className="field">
            <label>Nova quantidade</label>
            <input className="input" type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </div>
          {!isNaN(diff) && diff !== 0 && (
            <div style={{ fontSize: 12, color: diff > 0 ? 'var(--green)' : 'var(--red)' }}>
              {diff > 0 ? `+${diff}` : diff} unid. em relação ao atual
            </div>
          )}
          {error && (
            <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>{error}</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}
