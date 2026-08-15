'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { getAllAnnouncements } from '@/lib/supabase/announcements'
import type { AnnouncementMessage } from '@/lib/supabase/announcements'
import { revalidatePath } from 'next/cache'

export type { AnnouncementMessage } from '@/lib/supabase/announcements'

type Result = { ok: true } | { ok: false; error: string }

// O banner aparece no layout de toda a loja, com 60s de cache. Sem revalidar
// aqui, o Henrique salvaria a frase e continuaria vendo a antiga por um minuto,
// achando que não gravou.
function revalidateStore() {
  revalidatePath('/', 'layout')
  revalidatePath('/admin/config/banner')
}

export async function listAnnouncements(): Promise<AnnouncementMessage[]> {
  await requireAdmin()
  return getAllAnnouncements()
}

export async function createAnnouncement(content: string): Promise<Result> {
  await requireAdmin()
  const text = content.trim()
  if (!text) return { ok: false, error: 'Escreva a mensagem antes de salvar.' }

  const supabase = createServiceClient()

  const { data: last } = await supabase
    .from('announcement_messages')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((last?.sort_order as number | undefined) ?? 0) + 1

  const { error } = await supabase
    .from('announcement_messages')
    .insert({ content: text, sort_order: nextOrder, is_active: true })

  if (error) return { ok: false, error: error.message }
  revalidateStore()
  return { ok: true }
}

export async function updateAnnouncement(
  id: string,
  patch: { content?: string; is_active?: boolean; sort_order?: number },
): Promise<Result> {
  await requireAdmin()

  if (patch.content !== undefined && !patch.content.trim()) {
    return { ok: false, error: 'A mensagem não pode ficar vazia.' }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('announcement_messages')
    .update({
      ...(patch.content !== undefined ? { content: patch.content.trim() } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {}),
      ...(patch.sort_order !== undefined ? { sort_order: patch.sort_order } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidateStore()
  return { ok: true }
}

export async function deleteAnnouncement(id: string): Promise<Result> {
  await requireAdmin()
  const supabase = createServiceClient()
  const { error } = await supabase.from('announcement_messages').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidateStore()
  return { ok: true }
}

/** Troca a posição de duas mensagens. Usado pelas setas de ordenar. */
export async function swapAnnouncementOrder(
  aId: string,
  aOrder: number,
  bId: string,
  bOrder: number,
): Promise<Result> {
  await requireAdmin()
  const supabase = createServiceClient()

  const [first, second] = await Promise.all([
    supabase.from('announcement_messages').update({ sort_order: bOrder }).eq('id', aId),
    supabase.from('announcement_messages').update({ sort_order: aOrder }).eq('id', bId),
  ])

  const error = first.error ?? second.error
  if (error) return { ok: false, error: error.message }
  revalidateStore()
  return { ok: true }
}
