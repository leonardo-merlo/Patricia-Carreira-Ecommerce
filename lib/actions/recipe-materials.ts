'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import type { RecipeMaterialOption } from '@/lib/supabase/admin-queries'

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
