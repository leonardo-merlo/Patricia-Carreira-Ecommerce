'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { checkFocusNfe } from '@/lib/server/diagnostics'
import {
  getStoreSettings as getStoreSettingsCore,
  type SettingsUpdate,
  type StoreSettings,
} from '@/lib/server/store-settings'
import { revalidatePath } from 'next/cache'

export type { StoreSettings, SettingsUpdate } from '@/lib/server/store-settings'

// Leitura autorizada para o painel admin (client component). Código de servidor
// deve importar getStoreSettings direto de lib/server/store-settings.
export async function getStoreSettings(): Promise<StoreSettings | null> {
  await requireAdmin()
  return getStoreSettingsCore()
}

export async function updateStoreSettings(
  updates: SettingsUpdate
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: existing, error: fetchError } = await supabase
    .from('store_settings')
    .select('id')
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    return { ok: false, error: fetchError.message }
  }

  const payload = { ...updates, updated_at: new Date().toISOString() }

  if (existing) {
    const { error } = await supabase
      .from('store_settings')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('store_settings')
      .insert(payload)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/admin/config')
  // As configurações são lidas pelo rodapé de toda a loja, com cache de 60s.
  // Sem isto, mudar frete grátis ou contato demoraria até um minuto para valer.
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ─── Teste de conexão com a Focus NFe ────────────────────────────────────────

export type ConnectionTestResult = {
  ok: boolean
  environment: string
  detail: string
}

/**
 * Confere se o token da Focus NFe responde, e em que ambiente.
 *
 * Não emite nota: uma NF-e, mesmo em homologação, exige um pedido real com NCM
 * em cada produto. O caminho de emissão de verdade continua sendo o botão no
 * pedido, em /admin/pedidos.
 */
export async function testarConexaoFocusNfe(): Promise<ConnectionTestResult> {
  await requireAdmin()
  const result = await checkFocusNfe()
  return { ok: result.ok, environment: result.environment, detail: result.detail }
}
