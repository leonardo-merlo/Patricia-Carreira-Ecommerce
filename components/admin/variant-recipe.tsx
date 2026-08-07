"use client"

// Client component: reage à troca de cor recalculando o estoque na hora, sem
// round-trip, e guarda o estado de aberto/fechado do bloco.

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { ColorSelect } from '@/components/admin/color-select'
import { createPurchaseForCut } from '@/lib/actions/recipe-materials'
import { cutLineKey, type CutCategoryRow, type MaterialColor } from '@/lib/types'
import type { RawMaterialRow } from '@/lib/supabase/admin-queries'

/** Uma linha da receita do produto, como o modal a mantém em memória. */
export type RecipeLine = {
  raw_material_id: string | null
  material_category: string
  material_type: string
  quantity_needed: string
}

interface VariantRecipeProps {
  bom: RecipeLine[]
  cutCategories: CutCategoryRow[]
  colors: MaterialColor[]
  rawMaterials: RawMaterialRow[]
  /** Cor por peça, na chave `${categoria}||${peça}`. */
  cutColors: Record<string, string>
  onCutColorChange: (key: string, color: string) => void
  /** Pinta todas as peças de uma categoria de uma vez. */
  onPaintCategory: (category: string, color: string) => void
  onColorCreated: (color: MaterialColor) => void
  variantKey: string
}

type LineStatus =
  | { kind: 'ok'; stock: number; unit: string }
  | { kind: 'short'; stock: number; unit: string }
  | { kind: 'unregistered' }
  | { kind: 'no-color' }

/**
 * Resolve uma linha da receita no cliente.
 *
 * Faz o mesmo casamento que `resolve_variant_bom` faz no banco — (categoria,
 * peça, cor) contra `raw_materials` — mas em memória, porque o produto pode
 * ainda não ter sido salvo e porque trocar a cor precisa recalcular na hora.
 */
function resolveLine(
  line: RecipeLine,
  color: string | undefined,
  isCut: boolean,
  rawMaterials: RawMaterialRow[],
): LineStatus {
  const needed = parseFloat(line.quantity_needed) || 0

  if (isCut) {
    if (!color) return { kind: 'no-color' }
    const match = rawMaterials.find(
      (m) =>
        m.category === line.material_category &&
        (m.type_specific ?? m.name) === line.material_type &&
        m.color === color,
    )
    if (!match) return { kind: 'unregistered' }
    return {
      kind: match.stock_quantity >= needed ? 'ok' : 'short',
      stock: match.stock_quantity,
      unit: match.unit,
    }
  }

  const fixed = rawMaterials.find((m) => m.id === line.raw_material_id)
  if (!fixed) return { kind: 'unregistered' }
  return {
    kind: fixed.stock_quantity >= needed ? 'ok' : 'short',
    stock: fixed.stock_quantity,
    unit: fixed.unit,
  }
}

/** Botão que cria o pedido de compra da peça sem sair do modal. */
function PurchaseButton({
  category,
  materialType,
  color,
  unit,
  defaultQty,
}: {
  category: string
  materialType: string
  color: string | null
  unit: string
  defaultQty: number
}) {
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(String(defaultQty || 1))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const parsed = parseFloat(qty.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) {
      setError('Quantidade inválida.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await createPurchaseForCut({
      category,
      material_type: materialType,
      color,
      quantity: parsed,
      unit,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setDone(true)
    setOpen(false)
  }

  if (done) {
    return <span style={{ fontSize: 11, color: 'var(--green)' }}>pedido criado</span>
  }

  if (open) {
    return (
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        <input
          className="input"
          autoFocus
          style={{ width: 60, height: 22, padding: '2px 6px', fontSize: 11 }}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
        <button className="btn sm primary" type="button" onClick={handleCreate} disabled={saving}>
          {saving ? '…' : 'Pedir'}
        </button>
        <button className="icon-btn" type="button" onClick={() => setOpen(false)} title="Cancelar">
          <AdminIcon name="x" size={10} />
        </button>
        {error && <span style={{ fontSize: 10.5, color: 'var(--red)' }}>{error}</span>}
      </span>
    )
  }

  return (
    <button
      className="icon-btn"
      type="button"
      title="Criar pedido de compra"
      data-testid={`btn-comprar-${materialType}`}
      onClick={() => setOpen(true)}
    >
      <AdminIcon name="plus" size={11} />
    </button>
  )
}

function StatusCell({ status }: { status: LineStatus }) {
  if (status.kind === 'no-color') {
    return <span style={{ color: 'var(--text-3)' }}>escolha a cor</span>
  }
  if (status.kind === 'unregistered') {
    return <span style={{ color: 'var(--yellow)' }}>não cadastrado nesta cor</span>
  }
  return (
    <span style={{ color: status.kind === 'ok' ? 'var(--green)' : 'var(--red)' }}>
      {status.stock} {status.unit} em estoque
    </span>
  )
}

/**
 * A receita da variante: as linhas vêm da receita do produto, e as de corte
 * ganham cor e saldo concretos.
 *
 * A cor é POR PEÇA — a frente de lona pode ser azul e as costas verde. O
 * dropdown ao lado da categoria é atalho: pinta todas as peças dela de uma vez,
 * e cada peça continua editável depois.
 */
export function VariantRecipe({
  bom,
  cutCategories,
  colors,
  rawMaterials,
  cutColors,
  onCutColorChange,
  onPaintCategory,
  onColorCreated,
  variantKey,
}: VariantRecipeProps) {
  if (bom.length === 0) {
    return (
      <div className="cust-meta">
        Cadastre a receita acima; ela vale para todas as variantes.
      </div>
    )
  }

  const cutSet = new Set(cutCategories.map((c) => c.category))
  const categories = Array.from(new Set(bom.map((b) => b.material_category)))
  const ordered = [
    ...cutCategories.map((c) => c.category).filter((c) => categories.includes(c)),
    ...categories.filter((c) => !cutSet.has(c)).sort(),
  ]

  const faltando = bom.filter(
    (b) =>
      cutSet.has(b.material_category) &&
      !cutColors[cutLineKey(b.material_category, b.material_type)],
  )

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
        Receita desta variante
        <span className="cust-meta">· herdada do produto ({bom.length} itens)</span>
        {faltando.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--red)' }}>· {faltando.length} sem cor</span>
        )}
      </div>

      {ordered.map((category) => {
          const lines = bom.filter((b) => b.material_category === category)
          const isCut = cutSet.has(category)
          const catColors = colors.filter((c) => c.category === category)
          // Cor comum a todas as peças, se houver — senão o atalho fica vazio.
          const chosenAll = lines
            .map((l) => cutColors[cutLineKey(category, l.material_type)] ?? '')
            .reduce((acc, cur, i) => (i === 0 ? cur : acc === cur ? acc : ''), '')

          return (
            <div
              key={category}
              style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: 'var(--surface-2)',
                }}
              >
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{category}</div>
                {isCut ? (
                  <div style={{ width: 190 }}>
                    <ColorSelect
                      category={category}
                      colors={catColors}
                      value={chosenAll}
                      onChange={(c) => onPaintCategory(category, c)}
                      onColorCreated={onColorCreated}
                      testId={`select-cor-${category.replace(/\s+/g, '-').toLowerCase()}-${variantKey}`}
                    />
                  </div>
                ) : (
                  <div className="cust-meta">cor fixa</div>
                )}
                <div className="cust-meta" style={{ width: 62, textAlign: 'right' }}>
                  {lines.length} {lines.length === 1 ? 'item' : 'itens'}
                </div>
              </div>

              {isCut && (
                <div className="cust-meta" style={{ padding: '4px 10px', fontSize: 10.5 }}>
                  O seletor acima pinta todas as peças de uma vez — troque abaixo as que forem diferentes.
                </div>
              )}

              <table className="tbl" style={{ fontSize: 11.5 }}>
                <tbody>
                  {lines.map((line) => {
                    const key = cutLineKey(category, line.material_type)
                    const chosen = cutColors[key] ?? ''
                    const status = resolveLine(line, chosen || undefined, isCut, rawMaterials)
                    return (
                      <tr key={`${key}-${line.raw_material_id ?? ''}`}>
                        <td style={{ padding: '3px 10px' }}>{line.material_type}</td>
                        <td style={{ padding: '3px 10px', width: 60 }} className="cust-meta">
                          {line.quantity_needed} un
                        </td>
                        <td style={{ padding: '3px 10px', width: 170 }}>
                          {isCut ? (
                            <ColorSelect
                              category={category}
                              colors={catColors}
                              value={chosen}
                              onChange={(c) => onCutColorChange(key, c)}
                              onColorCreated={onColorCreated}
                              testId={`select-cor-peca-${key}-${variantKey}`}
                            />
                          ) : (
                            <span className="cust-meta">cor fixa</span>
                          )}
                        </td>
                        <td style={{ padding: '3px 10px', width: 175 }}>
                          <StatusCell status={status} />
                        </td>
                        <td style={{ padding: '3px 6px', width: 34, textAlign: 'center' }}>
                          {(status.kind === 'unregistered' || status.kind === 'short') && (
                            <PurchaseButton
                              category={category}
                              materialType={line.material_type}
                              color={isCut ? chosen || null : null}
                              unit={status.kind === 'short' ? status.unit : 'unidade'}
                              defaultQty={parseFloat(line.quantity_needed) || 1}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
      })}

      {faltando.length > 0 && (
        <div
          style={{ fontSize: 11.5, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <AdminIcon name="x" size={11} />
          {faltando.length} {faltando.length === 1 ? 'peça sem cor' : 'peças sem cor'} — preencha para salvar.
        </div>
      )}
    </div>
  )
}
