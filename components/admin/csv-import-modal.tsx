"use client"

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import { importStockPriceCsv, type CsvImportRow } from '@/lib/actions/products'
import type { ProductWithVariantsAndBom } from '@/lib/supabase/admin-queries'

interface CsvImportModalProps {
  products: ProductWithVariantsAndBom[]
  onClose: () => void
}

type PreviewRow = CsvImportRow & {
  found: boolean
  productName: string
  currentStock: number | null
  currentBasePrice: number | null
  currentWholesalePrice: number | null
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row
  })
}

function toNumberOrNull(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

export function CsvImportModal({ products, onClose }: CsvImportModalProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ updated: number; notFound: string[] } | null>(null)
  const [importError, setImportError] = useState('')

  // Índice sku → { variante, produto } para o preview
  const bySku = new Map<string, { stock: number; product: ProductWithVariantsAndBom }>()
  for (const p of products) {
    for (const v of p.variants) {
      bySku.set(v.sku, { stock: v.stock_quantity, product: p })
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
        return {
          sku,
          stock_quantity: toNumberOrNull(r.stock_quantity),
          base_price: toNumberOrNull(r.base_price),
          wholesale_price: toNumberOrNull(r.wholesale_price),
          found: Boolean(match),
          productName: match?.product.name ?? '—',
          currentStock: match?.stock ?? null,
          currentBasePrice: match?.product.base_price ?? null,
          currentWholesalePrice: match?.product.wholesale_price ?? null,
        }
      })
      setPreview(parsed)
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const csv = 'sku,stock_quantity,base_price,wholesale_price\nBOL-EXEM-MAR-UNI,10,89.90,59.90\nBOL-EXEM-AZU-UNI,,99.90,\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-importacao-estoque.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleConfirm() {
    if (!preview) return
    setImporting(true)
    setImportError('')
    const valid = preview.filter((r) => r.found)
    try {
      const res = await importStockPriceCsv(
        valid.map((r) => ({
          sku: r.sku,
          stock_quantity: r.stock_quantity,
          base_price: r.base_price,
          wholesale_price: r.wholesale_price,
        })),
      )
      if (!res.success) {
        setImportError(res.error)
      } else {
        setResult({ updated: res.updated, notFound: res.notFound })
        router.refresh()
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setImporting(false)
    }
  }

  const validCount = preview?.filter((r) => r.found).length ?? 0
  const invalidCount = preview?.filter((r) => !r.found).length ?? 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 640, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Importar CSV</h3>
            <div className="sub">Atualizar estoque e preços em massa</div>
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
            </div>
          ) : preview ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="cust-meta">{validCount} linha{validCount !== 1 ? 's' : ''} válida{validCount !== 1 ? 's' : ''}{invalidCount > 0 ? ` · ${invalidCount} com SKU não encontrado (serão ignoradas)` : ''}</div>
                <button className="linkish" style={{ fontSize: 12 }} onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}>Escolher outro arquivo</button>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: 'var(--text-2)' }}>
                Atenção: preço é por produto, não por variante — mudar o preço de um SKU muda o preço de todas as variantes do mesmo produto.
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
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} style={!r.found ? { opacity: 0.5 } : {}}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.sku}</td>
                        <td>{r.found ? r.productName : 'SKU não encontrado'}</td>
                        <td>{r.stock_quantity !== null ? `${r.currentStock ?? '—'} → ${r.stock_quantity}` : '—'}</td>
                        <td>{r.base_price !== null ? `${r.currentBasePrice != null ? formatPrice(r.currentBasePrice) : '—'} → ${formatPrice(r.base_price)}` : '—'}</td>
                        <td>{r.wholesale_price !== null ? `${r.currentWholesalePrice != null ? formatPrice(r.currentWholesalePrice) : '—'} → ${formatPrice(r.wholesale_price)}` : '—'}</td>
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
                <div className="cust-meta" style={{ marginTop: 2 }}>Colunas: sku, stock_quantity, base_price, wholesale_price</div>
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
