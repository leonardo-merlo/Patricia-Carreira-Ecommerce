'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import type { Store } from '@/lib/types'

export type StoreResult =
  | { success: true }
  | { success: false; error: string }

export async function getStores(): Promise<Store[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, city, notes, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[stores] getStores error:', error)
    return []
  }

  return (data ?? []) as Store[]
}

export async function createStore(input: {
  name: string
  city: string | null
  notes: string | null
}): Promise<StoreResult> {
  if (!input.name.trim()) {
    return { success: false, error: 'Nome da loja é obrigatório.' }
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('stores').insert({
    name: input.name.trim(),
    city: input.city?.trim() || null,
    notes: input.notes?.trim() || null,
  })

  if (error) {
    console.error('[stores] createStore error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function updateStore(
  id: string,
  input: { name: string; city: string | null; notes: string | null },
): Promise<StoreResult> {
  if (!input.name.trim()) {
    return { success: false, error: 'Nome da loja é obrigatório.' }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('stores')
    .update({
      name: input.name.trim(),
      city: input.city?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[stores] updateStore error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function deleteStore(id: string): Promise<StoreResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('stores')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[stores] deleteStore error:', error)
    return { success: false, error: 'Erro ao remover loja.' }
  }

  revalidatePath('/admin/financeiro')
  return { success: true }
}
