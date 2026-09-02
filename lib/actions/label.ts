'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { purchaseShippingLabel } from '@/lib/server/label'
import { generateLabel, getTrackingCode, printLabel } from '@/lib/integrations/melhor-envio'

/**
 * Refaz a compra da etiqueta de um pedido pago que ficou sem envio no Melhor Envio.
 *
 * Existe porque não havia caminho de volta: a compra automática acontece uma vez,
 * no pagamento, e quando ela falha o pedido fica com "Sem etiqueta" para sempre —
 * o botão "Gerar Etiqueta" só aparece depois que o envio existe. Pedido pago sem
 * etiqueta e sem botão é mercadoria que não sai.
 */
export async function comprarEtiqueta(
  orderId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const supabase = createServiceClient()

  try {
    await purchaseShippingLabel(orderId)
    await supabase.from('orders').update({ shipping_error: null }).eq('id', orderId)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao comprar etiqueta'
    await supabase.from('orders').update({ shipping_error: msg }).eq('id', orderId)
    return { ok: false, error: msg }
  }
}

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
