'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/server/auth'
import {
  getCustomerPurchaseDetail,
  type CustomerPurchaseDetail,
} from '@/lib/supabase/customer-queries'
import { revalidatePath } from 'next/cache'

export type CheckoutPrefill = {
  name: string
  email: string
  phone: string
  cpf: string
  address: {
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
    zip: string
  } | null
}

/**
 * Dados da própria cliente logada para preencher o checkout. Sem sessão devolve
 * null — visitante segue com o formulário em branco, como sempre.
 * Nunca recebe um id por parâmetro: o cadastro lido é sempre o do dono da sessão.
 */
export async function getCheckoutPrefill(): Promise<CheckoutPrefill | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()

  const { data: customer } = await service
    .from('customers')
    .select('name, email, phone, cpf_cnpj, address')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: profile } = await service
    .from('user_profiles')
    .select('name, phone, cpf')
    .eq('id', user.id)
    .maybeSingle()

  const address = (customer?.address ?? null) as CheckoutPrefill['address']

  return {
    name: customer?.name ?? profile?.name ?? '',
    email: customer?.email ?? user.email ?? '',
    phone: customer?.phone ?? profile?.phone ?? '',
    cpf: customer?.cpf_cnpj ?? profile?.cpf ?? '',
    address: address
      ? {
          street: address.street ?? '',
          number: address.number ?? '',
          complement: address.complement ?? '',
          neighborhood: address.neighborhood ?? '',
          city: address.city ?? '',
          state: address.state ?? '',
          zip: address.zip ?? '',
        }
      : null,
  }
}

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

/**
 * Histórico de compras de um cliente, carregado quando a ficha abre no painel.
 * Passa por requireAdmin porque recebe um id por parâmetro — sem isso, qualquer
 * sessão autenticada leria o que a cliente ao lado comprou.
 */
export async function getCustomerPurchases(customerId: string): Promise<CustomerPurchaseDetail> {
  await requireAdmin()
  return getCustomerPurchaseDetail(customerId)
}
