'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { revalidatePath } from 'next/cache'

type Address = {
  street?: string
  number?: string
  complement?: string | null
  neighborhood?: string
  city?: string
  state?: string
  zip?: string
} | null

export async function updateCustomer(
  id: string,
  data: {
    name: string
    email: string | null
    phone: string | null
    cpf_cnpj: string | null
    instagram: string | null
    type: 'retail' | 'wholesale'
    address: Address
  },
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('customers')
    .update({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      cpf_cnpj: data.cpf_cnpj || null,
      instagram: data.instagram || null,
      type: data.type,
      address: data.address,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/clientes')
  return { error: null }
}

export async function createCustomer(data: {
  name: string
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  instagram: string | null
  type: 'retail' | 'wholesale'
}): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = createServiceClient()
  const { error } = await supabase.from('customers').insert({
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    cpf_cnpj: data.cpf_cnpj || null,
    instagram: data.instagram || null,
    type: data.type,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/clientes')
  return { error: null }
}
