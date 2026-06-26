'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

type AffiliateFormData = {
  name: string
  email: string
  phone: string
  instagram?: string
  city: string
  howFound: string
  message?: string
}

export async function createAffiliateApplication(
  data: AffiliateFormData,
): Promise<{ success: boolean; error?: string }> {
  if (!data.name.trim() || !data.email.trim() || !data.phone.trim() || !data.city.trim()) {
    return { success: false, error: 'Preencha todos os campos obrigatórios.' }
  }

  const supabase = createServiceClient()

  const notes = JSON.stringify({
    instagram: data.instagram?.trim() || null,
    cidade: data.city.trim(),
    como_conheceu: data.howFound,
    mensagem: data.message?.trim() || null,
  })

  const { error } = await supabase.from('partners').insert({
    name: data.name.trim(),
    contact_name: data.name.trim(),
    type: 'affiliate',
    email: data.email.trim(),
    phone: data.phone.trim(),
    is_active: false,
    notes,
  })

  if (error) {
    console.error('[affiliate] insert error:', error)
    return { success: false, error: 'Erro ao salvar cadastro. Tente novamente.' }
  }

  return { success: true }
}

export async function invitePartnerUser(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  if (!email.trim()) return { ok: false, error: 'Email obrigatório.' }
  const supabase = createServiceClient()
  const { error } = await supabase.auth.admin.inviteUserByEmail(email.trim())
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getAffiliateProfile(): Promise<{
  name: string
  commissionPct: number
  paymentDay: number | null
} | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.email) return null

  const { data } = await supabase
    .from('partners')
    .select('name, contact_name, commission_pct, payment_day')
    .eq('email', session.user.email)
    .eq('type', 'affiliate')
    .single()

  if (!data) return null

  return {
    name: data.contact_name ?? data.name,
    commissionPct: data.commission_pct ?? 10,
    paymentDay: data.payment_day ?? null,
  }
}
