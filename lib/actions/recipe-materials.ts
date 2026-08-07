'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import type { RecipeMaterialOption } from '@/lib/supabase/admin-queries'

export type CreatePurchaseResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Cria o pedido de compra de uma peça direto da receita da variante.
 *
 * Se o insumo naquela cor ainda não existe em raw_materials, cria a linha com
 * estoque 0 antes — senão o pedido não teria a que se referir e o botão
 * "Receber" da aba Compras ficaria morto.
 */
export async function createPurchaseForCut(input: {
  category: string
  material_type: string
  color: string | null
  quantity: number
  unit: string
}): Promise<CreatePurchaseResult> {
  await requireAdmin()

  if (input.quantity <= 0) return { success: false, error: 'Quantidade inválida.' }

  const supabase = createServiceClient()

  let query = supabase
    .from('raw_materials')
    .select('id, unit')
    .eq('category', input.category)
    .eq('type_specific', input.material_type)

  query = input.color ? query.eq('color', input.color) : query.is('color', null)

  const { data: existing, error: findError } = await query.maybeSingle()
  if (findError) return { success: false, error: findError.message }

  let materialId = existing?.id as string | undefined
  let unit = (existing?.unit as string | undefined) ?? input.unit

  if (!materialId) {
    const { data: created, error: createError } = await supabase
      .from('raw_materials')
      .insert({
        name: input.material_type,
        type: 'bruta',
        category: input.category,
        type_specific: input.material_type,
        color: input.color,
        unit: input.unit,
        stock_quantity: 0,
        minimum_stock: 0,
      })
      .select('id, unit')
      .single()

    if (createError) return { success: false, error: createError.message }
    materialId = created.id as string
    unit = created.unit as string
  }

  const label = input.color
    ? `${input.material_type} (${input.color})`
    : input.material_type

  const { error } = await supabase.from('purchase_requests').insert({
    order_id: null,
    raw_material_id: materialId,
    material_name: label,
    quantity_needed: input.quantity,
    unit,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/materias')
  return { success: true }
}

export type CreateRecipeMaterialResult =
  | { success: true; option: RecipeMaterialOption }
  | { success: false; error: string }

/**
 * Cria um insumo a partir do seletor da receita.
 *
 * Categoria de corte: nada é gravado em raw_materials — no momento da receita
 * ainda não se sabe a cor, e o estoque de corte é por (peça, cor). A opção volta
 * só para o cliente montar a linha da receita; as linhas de estoque nascem
 * depois, pelo botão de cortes pendentes, quando a variante já escolheu a cor.
 *
 * Categoria de cor fixa: cria a linha em raw_materials com estoque 0.
 */
export async function createRecipeMaterial(input: {
  category: string
  type: string
  unit: string
}): Promise<CreateRecipeMaterialResult> {
  await requireAdmin()

  const type = input.type.trim()
  if (!type) return { success: false, error: 'Informe o nome do insumo.' }
  if (!input.category) return { success: false, error: 'Escolha a categoria.' }

  const supabase = createServiceClient()

  const { data: cut } = await supabase
    .from('cut_categories')
    .select('category')
    .eq('category', input.category)
    .maybeSingle()

  if (cut) {
    return {
      success: true,
      option: {
        raw_material_id: null,
        category: input.category,
        type,
        unit: 'unidade',
        is_cut: true,
      },
    }
  }

  const { data, error } = await supabase
    .from('raw_materials')
    .insert({
      name: type,
      type: 'bruta',
      category: input.category,
      type_specific: type,
      unit: input.unit,
      stock_quantity: 0,
      minimum_stock: 0,
    })
    .select('id, category, type_specific, name, unit')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/estoque')
  revalidatePath('/admin/materias')

  return {
    success: true,
    option: {
      raw_material_id: data.id as string,
      category: data.category as string,
      type: (data.type_specific as string | null) ?? (data.name as string),
      unit: data.unit as string,
      is_cut: false,
    },
  }
}
