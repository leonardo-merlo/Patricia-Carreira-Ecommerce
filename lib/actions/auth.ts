'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function updateProfileName(
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Nome não pode ser vazio' }

  const { error } = await supabase
    .from('user_profiles')
    .update({ name: trimmed })
    .eq('id', user.id)

  if (error) return { ok: false, error: 'Erro ao salvar nome' }

  revalidatePath('/conta')
  return { ok: true }
}
