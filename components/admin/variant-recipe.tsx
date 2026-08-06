"use client"

// Client component: reage à troca de cor no dropdown recalculando o estoque de
// cada peça na hora, sem round-trip.

import { AdminIcon } from '@/components/admin/admin-icon'
import { ColorSelect } from '@/components/admin/color-select'
import type { CutCategoryRow, MaterialColor } from '@/lib/types'
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
  /** Cor escolhida por categoria nesta variante. */
  cutColors: Record<string, string>
  onCutColorChange: (category: string, color: string) => void
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
 * ganham cor e saldo concretos. A cor é escolhida por CATEGORIA, não por peça —
 * uma variante tem uma cor de lona que vale para as 12 peças de lona dela.
 */
export function VariantRecipe({
  bom,
  cutCategories,
  colors,
  rawMaterials,
  cutColors,
  onCutColorChange,
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

  const faltando = ordered.filter((c) => cutSet.has(c) && !cutColors[c])

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 500 }}>
        Receita desta variante{' '}
        <span className="cust-meta">· herdada do produto ({bom.length} itens)</span>
      </div>

      {ordered.map((category) => {
        const lines = bom.filter((b) => b.material_category === category)
        const isCut = cutSet.has(category)
        const chosen = cutColors[category] ?? ''

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
                <div style={{ width: 200 }}>
                  <ColorSelect
                    category={category}
                    colors={colors.filter((c) => c.category === category)}
                    value={chosen}
                    onChange={(c) => onCutColorChange(category, c)}
                    onColorCreated={onColorCreated}
                    testId={`select-cor-${category.replace(/\s+/g, '-').toLowerCase()}-${variantKey}`}
                  />
                </div>
              ) : (
                <div className="cust-meta">cor fixa</div>
              )}
              <div className="cust-meta" style={{ width: 70, textAlign: 'right' }}>
                {lines.length} {lines.length === 1 ? 'item' : 'itens'}
              </div>
            </div>

            <table className="tbl" style={{ fontSize: 11.5 }}>
              <tbody>
                {lines.map((line) => {
                  const status = resolveLine(line, chosen || undefined, isCut, rawMaterials)
                  return (
                    <tr
                      key={`${line.material_category}-${line.material_type}-${line.raw_material_id ?? ''}`}
                    >
                      <td style={{ padding: '3px 10px' }}>{line.material_type}</td>
                      <td style={{ padding: '3px 10px', width: 70 }} className="cust-meta">
                        {line.quantity_needed} un
                      </td>
                      <td style={{ padding: '3px 10px', width: 190 }}>
                        <StatusCell status={status} />
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
          Defina a cor de {faltando.join(', ')} para salvar.
        </div>
      )}
    </div>
  )
}
