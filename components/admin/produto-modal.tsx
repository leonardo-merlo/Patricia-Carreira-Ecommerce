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
  type VariantInput,
  type VariantBomInput,
} from '@/lib/actions/products'
import { MANUAL_TAGS } from '@/lib/types'
import type { ProductWithVariantsAndBom, RawMaterialRow } from '@/lib/supabase/admin-queries'

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
  const s = (size || 'U').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').slice(0, 3).toUpperCase()
  return `${base}-${c}-${s}`
}

type BomRow = { tempBomId: string; raw_material_id: string; quantity_needed: string }

type VariantRow = {
  tempId: string
  id?: string
  color: string
  size: string
  sku: string
  stock: string
  imageFiles: File[]
  imagePreviews: string[] // existing URLs + object URLs, in display order
  existingImageCount: number // how many of imagePreviews are pre-existing URLs (not new files)
  bom: BomRow[]
  expanded: boolean
}

function emptyVariant(expanded = true): VariantRow {
  return {
    tempId: `${Date.now()}-${Math.random()}`,
    color: '',
    size: 'Único',
    sku: '',
    stock: '0',
    imageFiles: [],
    imagePreviews: [],
    existingImageCount: 0,
    bom: [],
    expanded,
  }
}

function variantSummary(v: VariantRow): string {
  const hasSize = v.size && v.size !== 'Único'
  const parts = [v.color, hasSize ? v.size : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' — ') : v.sku || 'Nova variante'
}

// ─── ProdutoModal ─────────────────────────────────────────────────────────────

interface ProdutoModalProps {
  mode: 'create' | 'edit'
  product?: ProductWithVariantsAndBom
  rawMaterials: RawMaterialRow[]
  onClose: () => void
}

export function ProdutoModal({ mode, product, rawMaterials, onClose }: ProdutoModalProps) {
  const router = useRouter()

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [basePrice, setBasePrice] = useState(product ? String(product.base_price) : '')
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesale_price ? String(product.wholesale_price) : '')
  const [category, setCategory] = useState<'bolsas' | 'roupas' | 'acessorios' | 'bazar'>(
    (product?.category as 'bolsas' | 'roupas' | 'acessorios' | 'bazar') ?? 'bolsas',
  )
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '')
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false)
  const [tags, setTags] = useState<string[]>(product?.tags ?? [])

  const [weightGrams, setWeightGrams] = useState(product?.weight_grams != null ? String(product.weight_grams) : '')
  const [lengthCm, setLengthCm] = useState(product?.length_cm != null ? String(product.length_cm) : '')
  const [widthCm, setWidthCm] = useState(product?.width_cm != null ? String(product.width_cm) : '')
  const [heightCm, setHeightCm] = useState(product?.height_cm != null ? String(product.height_cm) : '')

  const [ncm, setNcm] = useState(product?.ncm ?? '')
  const [cfop, setCfop] = useState(product?.cfop ?? '6102')

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const [variants, setVariants] = useState<VariantRow[]>(
    mode === 'edit' && product
      ? product.variants.map((v) => ({
          tempId: v.id,
          id: v.id,
          color: v.color ?? '',
          size: v.size ?? 'Único',
          sku: v.sku,
          stock: String(v.stock_quantity),
          imageFiles: [],
          imagePreviews: v.images ?? [],
          existingImageCount: (v.images ?? []).length,
          bom: (v.bom ?? []).map((b) => ({
            tempBomId: b.id,
            raw_material_id: b.raw_material_id,
            quantity_needed: String(b.quantity_needed),
          })),
          expanded: product.variants.length === 1,
        }))
      : [emptyVariant()],
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateVariant(tempId: string, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)))
  }

  function updateVariantField(tempId: string, field: 'color' | 'size' | 'sku' | 'stock', value: string) {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.tempId !== tempId) return v
        const next = { ...v, [field]: value }
        if ((field === 'color' || field === 'size') && name.trim() && !v.id) {
          next.sku = buildSku(name, next.color, next.size)
        }
        return next
      }),
    )
  }

  function addVariant() {
    const row = emptyVariant()
    if (name.trim()) row.sku = buildSku(name, '', 'Único')
    setVariants((prev) => [...prev.map((v) => ({ ...v, expanded: false })), row])
  }

  function removeVariant(tempId: string) {
    setVariants((prev) => prev.filter((v) => v.tempId !== tempId))
  }

  function handleVariantFiles(tempId: string, files: FileList | null) {
    if (!files) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setVariants((prev) =>
      prev.map((v) => {
        if (v.tempId !== tempId) return v
        return {
          ...v,
          imageFiles: [...v.imageFiles, ...list],
          imagePreviews: [...v.imagePreviews, ...list.map((f) => URL.createObjectURL(f))],
        }
      }),
    )
  }

  function removeVariantImage(tempId: string, idx: number) {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.tempId !== tempId) return v
        const isExisting = idx < v.existingImageCount
        return {
          ...v,
          imagePreviews: v.imagePreviews.filter((_, i) => i !== idx),
          existingImageCount: isExisting ? v.existingImageCount - 1 : v.existingImageCount,
          imageFiles: isExisting ? v.imageFiles : v.imageFiles.filter((_, i) => i !== idx - v.existingImageCount),
        }
      }),
    )
  }

  function usedMaterialIds(v: VariantRow): Set<string> {
    return new Set(v.bom.map((b) => b.raw_material_id))
  }

  function addBomRow(tempId: string, materialId: string) {
    if (!materialId) return
    setVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId
          ? { ...v, bom: [...v.bom, { tempBomId: `${Date.now()}-${Math.random()}`, raw_material_id: materialId, quantity_needed: '1' }] }
          : v,
      ),
    )
  }

  function updateBomQty(tempId: string, tempBomId: string, qty: string) {
    setVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId
          ? { ...v, bom: v.bom.map((b) => (b.tempBomId === tempBomId ? { ...b, quantity_needed: qty } : b)) }
          : v,
      ),
    )
  }

  function removeBomRow(tempId: string, tempBomId: string) {
    setVariants((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, bom: v.bom.filter((b) => b.tempBomId !== tempBomId) } : v)),
    )
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    const price = parseFloat(basePrice.replace(',', '.'))
    if (isNaN(price) || price <= 0) { setError('Preço varejo inválido.'); return }
    if (variants.some((v) => !v.sku.trim())) { setError('Todas as variantes precisam ter SKU.'); return }
    const invalidBom = variants.some((v) => v.bom.some((b) => !b.raw_material_id || isNaN(parseFloat(b.quantity_needed)) || parseFloat(b.quantity_needed) <= 0))
    if (invalidBom) { setError('Verifique as quantidades da receita (BOM).'); return }

    setSaving(true)
    setError(null)

    try {
      const wholesale = wholesalePrice ? parseFloat(wholesalePrice.replace(',', '.')) : null

      const variantInputs: VariantInput[] = []
      for (const v of variants) {
        const uploadedUrls: string[] = []
        for (const file of v.imageFiles) {
          const fd = new FormData()
          fd.append('file', file)
          uploadedUrls.push(await uploadProductImage(fd))
        }
        const existingUrls = v.imagePreviews.slice(0, v.existingImageCount)
        const finalImages = [...existingUrls, ...uploadedUrls]
        const bom: VariantBomInput[] = v.bom.map((b) => ({
          raw_material_id: b.raw_material_id,
          quantity_needed: parseFloat(b.quantity_needed),
        }))
        variantInputs.push({
          tempId: v.tempId,
          id: v.id,
          color: v.color.trim() || null,
          size: v.size.trim() || 'Único',
          sku: v.sku.trim(),
          stock_quantity: Math.max(0, parseInt(v.stock) || 0),
          images: finalImages,
          bom,
        })
      }

      const shared = {
        name: name.trim(),
        description: description.trim() || null,
        base_price: price,
        wholesale_price: wholesale,
        category,
        subcategory: category === 'roupas' && subcategory ? subcategory : null,
        is_active: isActive,
        is_featured: isFeatured,
        weight_grams: weightGrams ? parseInt(weightGrams) : null,
        length_cm: lengthCm ? parseInt(lengthCm) : null,
        width_cm: widthCm ? parseInt(widthCm) : null,
        height_cm: heightCm ? parseInt(heightCm) : null,
        tags,
        ncm: ncm.trim() || null,
        cfop: cfop.trim() || null,
      }

      if (mode === 'create') {
        const input: CreateProductInput = { ...shared, variants: variantInputs }
        await createProduct(input)
      } else if (product) {
        const data: UpdateProductData = { ...shared, variants: variantInputs }
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 760, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{mode === 'create' ? 'Novo produto' : 'Editar produto'}</h3>
            {product && <div className="sub">{product.name}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><AdminIcon name="x" size={14} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Dados gerais */}
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Dados gerais</div>
            <div className="field">
              <label>Nome do produto *</label>
              <input className="input" data-testid="input-nome-produto" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bolsa Tiracolo Margaridas" />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12.5 }}>Ativo no e-commerce</div>
                  <div className="cust-meta">Visível na loja online</div>
                </div>
                <button type="button" onClick={() => setIsActive((v) => !v)} className={`switch ${isActive ? 'on' : ''}`} style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12.5 }}>Destaque na home</div>
                  <div className="cust-meta">Aparece na seção &quot;Destaques&quot;</div>
                </div>
                <button type="button" data-testid="checkbox-destaque" onClick={() => setIsFeatured((v) => !v)} className={`switch ${isFeatured ? 'on' : ''}`} style={{ cursor: 'pointer' }} />
              </div>
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
            </div>
          </div>

          {/* Peso e dimensões */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Peso e dimensões</div>
            <div className="cust-meta" style={{ marginBottom: 8 }}>Obrigatórios para calcular o frete. Valem para todas as variantes deste produto.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Peso (g)</label>
                <input className="input" data-testid="input-peso" type="number" min="0" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} placeholder="Ex: 350" />
              </div>
              <div className="field">
                <label>Comprimento (cm)</label>
                <input className="input" data-testid="input-comprimento" type="number" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} />
              </div>
              <div className="field">
                <label>Largura (cm)</label>
                <input className="input" data-testid="input-largura" type="number" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
              </div>
              <div className="field">
                <label>Altura (cm)</label>
                <input className="input" data-testid="input-altura" type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Dados Fiscais */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Dados Fiscais</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>
                  NCM{' '}
                  <a
                    href="https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/ncm"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 4 }}
                  >
                    Consultar NCM
                  </a>
                </label>
                <input
                  className="input"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Ex: 42022200"
                  maxLength={8}
                  style={{ fontFamily: 'monospace' }}
                  data-testid="input-ncm"
                />
                <div className="cust-meta" style={{ marginTop: 4 }}>8 dígitos. Obrigatório para emissão de NF-e.</div>
              </div>
              <div className="field">
                <label>CFOP</label>
                <select
                  className="select"
                  value={cfop}
                  onChange={(e) => setCfop(e.target.value)}
                  data-testid="select-cfop"
                >
                  <option value="5102">5102 — Venda mesmo estado</option>
                  <option value="6102">6102 — Venda interestadual</option>
                </select>
              </div>
            </div>
          </div>

          {/* Variantes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Variantes</div>
              <button className="btn sm primary" type="button" id="btn-add-variante" onClick={addVariant}><AdminIcon name="plus" size={11} /> Adicionar variante</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {variants.map((v) => {
                const available = rawMaterials.filter((m) => !usedMaterialIds(v).has(m.id))
                return (
                  <div key={v.tempId} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {/* Header do card */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface-2)', cursor: 'pointer' }}
                      onClick={() => updateVariant(v.tempId, { expanded: !v.expanded })}
                    >
                      <AdminIcon name={v.expanded ? 'chevDown' : 'chevRight'} size={12} />
                      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{variantSummary(v)}</div>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: 'var(--text-3)' }}>{v.sku}</div>
                      {!v.id && variants.length > 1 && (
                        <button
                          className="icon-btn"
                          type="button"
                          title="Remover variante"
                          onClick={(e) => { e.stopPropagation(); removeVariant(v.tempId) }}
                        >
                          <AdminIcon name="x" size={12} />
                        </button>
                      )}
                    </div>

                    {v.expanded && (
                      <div style={{ padding: 12, display: 'grid', gap: 12 }}>
                        {/* Campos básicos */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8 }}>
                          <div className="field">
                            <label>Cor</label>
                            <input className="input" value={v.color} onChange={(e) => updateVariantField(v.tempId, 'color', e.target.value)} placeholder="Marinho" />
                          </div>
                          <div className="field">
                            <label>Tamanho</label>
                            <input className="input" value={v.size} onChange={(e) => updateVariantField(v.tempId, 'size', e.target.value)} placeholder="Único / P / M / G" />
                          </div>
                          <div className="field">
                            <label>SKU *</label>
                            <input className="input" style={{ fontFamily: 'monospace', fontSize: 11 }} value={v.sku} onChange={(e) => updateVariantField(v.tempId, 'sku', e.target.value)} placeholder="BOL-TIRA-MAR-UNI" />
                          </div>
                          <div className="field">
                            <label>Estoque</label>
                            <input className="input" type="number" min="0" value={v.stock} onChange={(e) => updateVariantField(v.tempId, 'stock', e.target.value)} />
                          </div>
                        </div>

                        {/* Fotos da variante */}
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Fotos desta variante</label>
                          <VariantDropzone
                            testId={`dropzone-variante-${v.tempId}`}
                            onFiles={(files) => handleVariantFiles(v.tempId, files)}
                          />
                          {v.imagePreviews.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              {v.imagePreviews.map((src, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={src} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                                  <button
                                    onClick={() => removeVariantImage(v.tempId, i)}
                                    style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: 'var(--red)', color: '#fff', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}
                                  >
                                    <AdminIcon name="x" size={9} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* BOM da variante */}
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Receita (BOM)</label>
                          {v.bom.length > 0 && (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                              <table className="tbl" style={{ fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    <th>Matéria-prima</th>
                                    <th style={{ width: 90 }}>Qtd. / unid.</th>
                                    <th style={{ width: 32 }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.bom.map((b) => {
                                    const mat = rawMaterials.find((m) => m.id === b.raw_material_id)
                                    return (
                                      <tr key={b.tempBomId}>
                                        <td style={{ padding: '4px 10px' }}>{mat?.name ?? '—'} <span className="cust-meta">({mat?.unit})</span></td>
                                        <td style={{ padding: '4px 10px' }}>
                                          <input
                                            className="input"
                                            style={{ height: 24, padding: '2px 6px' }}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={b.quantity_needed}
                                            onChange={(e) => updateBomQty(v.tempId, b.tempBomId, e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                          <button className="icon-btn" type="button" onClick={() => removeBomRow(v.tempId, b.tempBomId)}>
                                            <AdminIcon name="x" size={11} />
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {available.length > 0 ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <select
                                className="select"
                                data-testid={`select-bom-material-${v.tempId}`}
                                style={{ flex: 1 }}
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addBomRow(v.tempId, e.target.value)
                                    e.target.value = ''
                                  }
                                }}
                              >
                                <option value="">+ Adicionar matéria-prima…</option>
                                {available.map((m) => (
                                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="cust-meta">Nenhuma matéria-prima disponível para adicionar.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
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
    </div>
  )
}

// ─── VariantDropzone ──────────────────────────────────────────────────────────

function VariantDropzone({ testId, onFiles }: { testId: string; onFiles: (files: FileList | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div
      style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 8, background: 'var(--surface-2)', padding: '14px 12px', textAlign: 'center', cursor: 'pointer' }}
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files) }}
    >
      <AdminIcon name="upload" size={16} style={{ display: 'block', margin: '0 auto 4px', color: 'var(--text-2)' }} />
      <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>Arraste imagens ou clique para selecionar</div>
      <input
        ref={fileRef}
        data-testid={testId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
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
