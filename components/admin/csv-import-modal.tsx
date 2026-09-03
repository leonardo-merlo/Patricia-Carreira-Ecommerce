"use client"

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import { parseCsv, toCsv, downloadCsv } from '@/lib/csv'
import { importProductsCsv, type CsvImportRow } from '@/lib/actions/products'
import type { ProductVariant } from '@/lib/types'
import type { ProductWithVariantsAndBom } from '@/lib/supabase/admin-queries'

interface CsvImportModalProps {
  products: ProductWithVariantsAndBom[]
  onClose: () => void
}

const FIELD_LABELS: Record<string, string> = {
  product_name: 'nome',
  description: 'descrição',
  category: 'categoria',
  subcategory: 'subcategoria',
  color: 'cor',
  size: 'tamanho',
  is_active: 'ativo',
  is_featured: 'destaque',
  tags: 'tags',
  weight_grams: 'peso',
  length_cm: 'comprimento',
  width_cm: 'largura',
  height_cm: 'altura',
}

type PreviewRow = CsvImportRow & {
  found: boolean
  rowError: string | null
  productName: string
  currentStock: number | null
  currentBasePrice: number | null
  currentWholesalePrice: number | null
  otherFields: string[] // labels dos campos extras preenchidos (fora estoque/preços)
}

function toNumberOrNull(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

function toBoolOrNull(v: string | undefined): boolean | null {
  if (!v || v.trim() === '') return null
  const s = v.trim().toLowerCase()
  if (['true', 'verdadeiro', '1', 'sim'].includes(s)) return true
  if (['false', 'falso', '0', 'não', 'nao'].includes(s)) return false
  return null
}

function toTagsOrNull(v: string | undefined): string[] | null {
  if (!v || v.trim() === '') return null
  return v.split('|').map((t) => t.trim()).filter(Boolean)
}

const CATEGORIES = new Set(['bolsas', 'roupas', 'acessorios', 'almofadas', 'bazar'])
const SUBCATEGORIES = new Set(['vestidos', 'batas'])

function validateRow(row: CsvImportRow): string | null {
  if (row.category !== null && !CATEGORIES.has(row.category)) return `categoria inválida "${row.category}"`
  if (row.subcategory !== null && row.subcategory !== '' && !SUBCATEGORIES.has(row.subcategory)) {
    return `subcategoria inválida "${row.subcategory}"`
  }
  return null
}

const TEMPLATE_HEADERS = [
  'sku', 'nome_produto', 'descricao', 'categoria', 'subcategoria', 'cor', 'tamanho',
  'estoque', 'preco_varejo', 'preco_atacado', 'ativo_ecommerce', 'destaque_home', 'tags',
  'peso_g', 'comprimento_cm', 'largura_cm', 'altura_cm',
]

export function CsvImportModal({ products, onClose }: CsvImportModalProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ updated: number; notFound: string[]; invalid: { sku: string; reason: string }[] } | null>(null)
  const [importError, setImportError] = useState('')

  // Índice sku → { variante, produto } para o preview
  const bySku = new Map<string, { variant: ProductVariant; product: ProductWithVariantsAndBom }>()
  for (const p of products) {
    for (const v of p.variants) {
      bySku.set(v.sku, { variant: v, product: p })
    }
  }

  function handleFile(file: File | null) {
    if (!file) return
    setParseError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setParseError('Não foi possível ler linhas válidas do arquivo.')
        return
      }
      if (!('sku' in rows[0])) {
        setParseError('Coluna "sku" não encontrada no cabeçalho do CSV.')
        return
      }
      const parsed: PreviewRow[] = rows.map((r) => {
        const sku = r.sku ?? ''
        const match = bySku.get(sku)
        const row: CsvImportRow = {
          sku,
          product_name: r.nome_produto || null,
          description: r.descricao || null,
          category: r.categoria ? r.categoria.trim().toLowerCase() : null,
          subcategory: r.subcategoria !== undefined && r.subcategoria.trim() !== '' ? r.subcategoria.trim().toLowerCase() : null,
          color: r.cor || null,
          size: r.tamanho || null,
          stock_quantity: toNumberOrNull(r.estoque),
          base_price: toNumberOrNull(r.preco_varejo),
          wholesale_price: toNumberOrNull(r.preco_atacado),
          is_active: toBoolOrNull(r.ativo_ecommerce),
          is_featured: toBoolOrNull(r.destaque_home),
          tags: toTagsOrNull(r.tags),
          weight_grams: toNumberOrNull(r.peso_g),
          length_cm: toNumberOrNull(r.comprimento_cm),
          width_cm: toNumberOrNull(r.largura_cm),
          height_cm: toNumberOrNull(r.altura_cm),
        }
        const otherFields = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[])
          .filter((k) => (row as unknown as Record<string, unknown>)[k] !== null)
          .map((k) => FIELD_LABELS[k])
        return {
          ...row,
          found: Boolean(match),
          rowError: match ? validateRow(row) : null,
          productName: match?.product.name ?? '—',
          currentStock: match?.variant.stock_quantity ?? null,
          currentBasePrice: match?.product.base_price ?? null,
          currentWholesalePrice: match?.product.wholesale_price ?? null,
          otherFields,
        }
      })
      setPreview(parsed)
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const csv = toCsv(TEMPLATE_HEADERS, [
      ['BOL-EXEM-MAR-UNI', 'Bolsa Exemplo Margaridas', 'Bolsa artesanal em tecido', 'bolsas', '', 'Marfim', 'Único', 10, '89,90', '59,90', 'TRUE', 'FALSE', 'Lançamento', 350, 30, 20, 12],
      ['VES-EXEM-AZU-M', 'Vestido Exemplo', 'Vestido leve de verão', 'roupas', 'vestidos', 'Azul', 'M', 5, '199,90', '', 'TRUE', 'TRUE', '', 300, 40, 30, 5],
    ])
    downloadCsv('modelo-importacao-estoque.csv', csv)
  }

  async function handleConfirm() {
    if (!preview) return
    setImporting(true)
    setImportError('')
    const valid = preview.filter((r) => r.found && !r.rowError)
    try {
      const res = await importProductsCsv(valid.map((r): CsvImportRow => ({
        sku: r.sku,
        product_name: r.product_name,
        description: r.description,
        category: r.category,
        subcategory: r.subcategory,
        color: r.color,
        size: r.size,
        stock_quantity: r.stock_quantity,
        base_price: r.base_price,
        wholesale_price: r.wholesale_price,
        is_active: r.is_active,
        is_featured: r.is_featured,
        tags: r.tags,
        weight_grams: r.weight_grams,
        length_cm: r.length_cm,
        width_cm: r.width_cm,
        height_cm: r.height_cm,
      })))
      if (!res.success) {
        setImportError(res.error)
      } else {
        setResult({ updated: res.updated, notFound: res.notFound, invalid: res.invalid })
        router.refresh()
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setImporting(false)
    }
  }

  const validCount = preview?.filter((r) => r.found && !r.rowError).length ?? 0
  const invalidCount = (preview?.length ?? 0) - validCount

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 720, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Importar CSV</h3>
            <div className="sub">Atualizar produtos e variantes existentes em massa</div>
          </div>
          <button className="icon-btn" onClick={onClose}><AdminIcon name="x" size={14} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', display: 'grid', gap: 14 }}>
          {result ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ background: 'var(--green-soft, #e6f4ea)', color: 'var(--green)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                {result.updated} linha{result.updated !== 1 ? 's' : ''} atualizada{result.updated !== 1 ? 's' : ''} com sucesso.
              </div>
              {result.notFound.length > 0 && (
                <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5 }}>
                  SKU(s) não encontrado(s): {result.notFound.join(', ')}
                </div>
              )}
              {result.invalid.length > 0 && (
                <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5 }}>
                  Linha(s) ignorada(s) por erro: {result.invalid.map((i) => `${i.sku} (${i.reason})`).join(', ')}
                </div>
              )}
            </div>
          ) : preview ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="cust-meta">{validCount} linha{validCount !== 1 ? 's' : ''} válida{validCount !== 1 ? 's' : ''}{invalidCount > 0 ? ` · ${invalidCount} com problema (serão ignoradas)` : ''}</div>
                <button className="linkish" style={{ fontSize: 12 }} onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}>Escolher outro arquivo</button>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: 'var(--text-2)' }}>
                Atenção: nome, categoria, preço e outros campos de produto valem pra todas as variantes do mesmo SKU-pai — se o CSV tiver valores diferentes em linhas do mesmo produto, a última linha processada é a que vale. Célula vazia = campo não é alterado.
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Produto</th>
                      <th>Estoque</th>
                      <th>Preço varejo</th>
                      <th>Preço atacado</th>
                      <th>Outros campos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} style={!r.found || r.rowError ? { opacity: 0.5 } : {}}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.sku}</td>
                        <td>{!r.found ? 'SKU não encontrado' : r.rowError ? r.rowError : r.productName}</td>
                        <td>{r.stock_quantity !== null ? `${r.currentStock ?? '—'} → ${r.stock_quantity}` : '—'}</td>
                        <td>{r.base_price !== null ? `${r.currentBasePrice != null ? formatPrice(r.currentBasePrice) : '—'} → ${formatPrice(r.base_price)}` : '—'}</td>
                        <td>{r.wholesale_price !== null ? `${r.currentWholesalePrice != null ? formatPrice(r.currentWholesalePrice) : '—'} → ${formatPrice(r.wholesale_price)}` : '—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{r.otherFields.length > 0 ? r.otherFields.join(', ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importError && (
                <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5 }}>{importError}</div>
              )}
            </>
          ) : (
            <>
              <div
                style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 8, background: 'var(--surface-2)', padding: '24px 16px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null) }}
              >
                <AdminIcon name="upload" size={18} style={{ display: 'block', margin: '0 auto 6px', color: 'var(--text-2)' }} />
                <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Arraste o CSV ou clique para selecionar</div>
                <div className="cust-meta" style={{ marginTop: 2 }}>Só &quot;sku&quot; é obrigatório — as demais colunas são opcionais (vazio = não altera)</div>
              </div>
              <input
                ref={fileRef}
                data-testid="input-csv-file"
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {parseError && (
                <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5 }}>{parseError}</div>
              )}
              <button className="linkish" style={{ fontSize: 12.5, justifySelf: 'start' }} onClick={downloadTemplate}>
                <AdminIcon name="download" size={11} /> Baixar modelo
              </button>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>{result ? 'Fechar' : 'Cancelar'}</button>
          {preview && !result && (
            <button className="btn primary" onClick={handleConfirm} disabled={importing || validCount === 0}>
              {importing ? 'Importando…' : `Confirmar (${validCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
