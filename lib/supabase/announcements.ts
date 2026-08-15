import { createServiceClient } from '@/lib/supabase/service'

export type AnnouncementMessage = {
  id: string
  content: string
  sort_order: number
  is_active: boolean
}

/**
 * Lido pelo layout da loja, ou seja, por toda página pública. Cacheado por 60s
 * pela mesma razão do rodapé: leitura sem cache aqui impede qualquer página de
 * ser estática e leva o build de 2 para 4 minutos. Quem edita revalida na hora.
 */
export async function getActiveAnnouncements(): Promise<AnnouncementMessage[]> {
  const supabase = createServiceClient({ revalidateSeconds: 60 })
  const { data, error } = await supabase
    .from('announcement_messages')
    .select('id, content, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[getActiveAnnouncements]', error.message)
    return []
  }
  return (data ?? []) as AnnouncementMessage[]
}

/** Todas as mensagens, ativas ou não — só o painel usa. */
export async function getAllAnnouncements(): Promise<AnnouncementMessage[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('announcement_messages')
    .select('id, content, sort_order, is_active')
    .order('sort_order')

  if (error) {
    console.error('[getAllAnnouncements]', error.message)
    return []
  }
  return (data ?? []) as AnnouncementMessage[]
}
