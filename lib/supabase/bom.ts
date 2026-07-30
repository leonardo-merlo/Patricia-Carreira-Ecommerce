import { createServiceClient } from '@/lib/supabase/service'

/**
 * Uma linha da receita do produto já resolvida para uma variante específica.
 *
 * Itens de corte (Corte Lona/Forro/Couro) são guardados na receita como
 * categoria + tipo; a cor vem de product_variants.color_<lona|forro|couro>.
 * `resolved = false` significa que o insumo naquela cor ainda não existe em
 * raw_materials — pendência de cadastro, não erro.
 */
export type ResolvedBomLine = {
  bom_id: string
  raw_material_id: string | null
  material_name: string
  material_category: string
  material_type: string
  required_color: string | null
  unit: string
  stock_quantity: number
  quantity_needed: number
  resolved: boolean
}

type ResolvedBomRow = Omit<ResolvedBomLine, 'stock_quantity' | 'quantity_needed'> & {
  stock_quantity: string | number
  quantity_needed: string | number
}

function normalize(row: ResolvedBomRow): ResolvedBomLine {
  return {
    ...row,
    stock_quantity: Number(row.stock_quantity),
    quantity_needed: Number(row.quantity_needed),
  }
}

export async function getResolvedBomForVariant(variantId: string): Promise<ResolvedBomLine[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('resolve_variant_bom', { p_variant_id: variantId })

  if (error) {
    console.error('[getResolvedBomForVariant]', error)
    return []
  }

  return ((data ?? []) as ResolvedBomRow[]).map(normalize)
}

/** Resolve a receita de várias variantes de uma vez. Chave do retorno: variant id. */
export async function getResolvedBomForVariants(
  variantIds: string[],
): Promise<Record<string, ResolvedBomLine[]>> {
  const unique = Array.from(new Set(variantIds))
  const results = await Promise.all(
    unique.map(async (id) => [id, await getResolvedBomForVariant(id)] as const),
  )
  return Object.fromEntries(results)
}
