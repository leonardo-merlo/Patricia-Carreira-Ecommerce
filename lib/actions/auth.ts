'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type CustomerAddress = {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip: string
}

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

export async function updateCustomerAddress(
  address: CustomerAddress
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const service = createServiceClient()

  const { data: existing } = await service
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await service
      .from('customers')
      .update({ address })
      .eq('user_id', user.id)

    if (error) return { ok: false, error: 'Erro ao salvar endereço' }
  } else {
    const { error } = await service
      .from('customers')
      .insert({ user_id: user.id, type: 'retail', name: user.email ?? '', address })

    if (error) return { ok: false, error: 'Erro ao salvar endereço' }
  }

  revalidatePath('/conta')
  return { ok: true }
}
