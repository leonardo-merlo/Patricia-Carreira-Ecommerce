'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import type { MaterialColor } from '@/lib/types'

export type CreateColorResult =
  | { success: true; color: MaterialColor }
  | { success: false; error: string }

/**
 * Acrescenta uma cor à paleta de uma categoria de corte.
 *
 * É o único caminho de criação: não existe tela de paleta, a cor nasce de dentro
 * do dropdown onde ela vai ser usada. Renomear e desativar ficaram de fora de
 * propósito — renomear precisa arrastar junto `raw_materials.color`, que é texto
 * solto, e isso pede uma migration própria.
 */
export async function createMaterialColor(
  category: string,
  name: string,
): Promise<CreateColorResult> {
  await requireAdmin()

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Informe o nome da cor.' }

  const supabase = createServiceClient()

  const { data: known, error: catError } = await supabase
    .from('cut_categories')
    .select('category')
    .eq('category', category)
    .maybeSingle()

  if (catError) return { success: false, error: catError.message }
  if (!known) return { success: false, error: `Categoria desconhecida: ${category}` }

  const { data, error } = await supabase
    .from('material_colors')
    .insert({ category, name: trimmed })
    .select('id, category, name, hex, is_placeholder, is_active, sort_order')
    .single()

  if (error) {
    // 23505 = a UNIQUE (category, name). Acontece quando o Henrique digita uma
    // cor que já existe; "violação de constraint" não ajudaria ninguém.
    if (error.code === '23505') {
      return { success: false, error: `"${trimmed}" já existe nessa categoria.` }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/estoque')
  revalidatePath('/admin/materias')
  return { success: true, color: data as MaterialColor }
}
