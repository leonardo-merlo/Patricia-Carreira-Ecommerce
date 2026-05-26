'use server'

import { createServiceClient } from '@/lib/supabase/service'

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
