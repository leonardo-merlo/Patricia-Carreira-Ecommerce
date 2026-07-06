'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { generateLabel, getTrackingCode, printLabel } from '@/lib/integrations/melhor-envio'

// Called from admin panel when generate was deferred (e.g. sandbox approval delay)
export async function generateShippingLabel(
  orderId: string,
  meOrderId: string
): Promise<{ ok: true; tracking: string | null } | { ok: false; error: string }> {
  await requireAdmin()
  try {
    await generateLabel([meOrderId])
    await new Promise((r) => setTimeout(r, 2000))

    const tracking = await getTrackingCode(meOrderId)

    if (tracking) {
      const supabase = createServiceClient()
      await supabase.from('orders').update({ tracking_code: tracking }).eq('id', orderId)
    }

    return { ok: true, tracking }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar etiqueta'
    return { ok: false, error: msg }
  }
}

// Called from admin panel to get the print URL for a label
export async function getLabelPrintUrl(
  meOrderId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin()
  try {
    const url = await printLabel([meOrderId])
    return { ok: true, url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao obter link de impressão'
    return { ok: false, error: msg }
  }
}
