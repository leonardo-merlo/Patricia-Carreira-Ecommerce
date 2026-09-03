'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import {
  cotarFretesDoPedido,
  purchaseShippingLabel,
  TransportadoraIndisponivelError,
  type OpcaoFretePedido,
} from '@/lib/server/label'
import { generateLabel, getTrackingCode, printLabel } from '@/lib/integrations/melhor-envio'

export type ComprarEtiquetaResult =
  | { ok: true }
  | { ok: false; error: string; alternativas?: OpcaoFretePedido[] }

/**
 * Refaz a compra da etiqueta de um pedido pago que ficou sem envio no Melhor Envio.
 *
 * Existe porque não havia caminho de volta: a compra automática acontece uma vez,
 * no pagamento, e quando ela falha o pedido fica com "Sem etiqueta" para sempre —
 * o botão "Gerar Etiqueta" só aparece depois que o envio existe. Pedido pago sem
 * etiqueta e sem botão é mercadoria que não sai.
 *
 * `serviceId` é a troca de transportadora: o pedido guarda a escolha do cliente
 * no checkout, e quando ela deixa de atender o trecho não há como despachar sem
 * escolher outra. O servidor revalida o serviço na cotação de agora — o
 * navegador diz qual, nunca por quanto.
 */
export async function comprarEtiqueta(
  orderId: string,
  serviceId?: number
): Promise<ComprarEtiquetaResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  try {
    await purchaseShippingLabel(orderId, serviceId)
    await supabase.from('orders').update({ shipping_error: null }).eq('id', orderId)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao comprar etiqueta'
    await supabase.from('orders').update({ shipping_error: msg }).eq('id', orderId)

    if (err instanceof TransportadoraIndisponivelError) {
      return { ok: false, error: msg, alternativas: err.alternativas }
    }
    return { ok: false, error: msg }
  }
}

/**
 * Transportadoras que atendem o trecho do pedido agora, com o preço de agora.
 *
 * O painel chama quando o Henrique vai trocar a transportadora de um pedido cuja
 * compra falhou — inclusive depois de recarregar a página, quando o motivo do
 * erro está salvo no pedido mas as alternativas não.
 */
export async function cotarEtiqueta(
  orderId: string
): Promise<{ ok: true; origem: string; destino: string; opcoes: OpcaoFretePedido[] } | { ok: false; error: string }> {
  await requireAdmin()

  try {
    const { origem, destino, opcoes } = await cotarFretesDoPedido(orderId)
    return { ok: true, origem, destino, opcoes }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao cotar frete'
    return { ok: false, error: msg }
  }
}

export type GerarEtiquetaResult =
  | { ok: true; tracking: string | null }
  /** Nem pronta nem falha: o Melhor Envio ainda está na fila. */
  | { ok: true; tracking: null; aguardando: true; aviso: string }
  | { ok: false; error: string }

// Called from admin panel when generate was deferred (e.g. sandbox approval delay)
export async function generateShippingLabel(
  orderId: string,
  meOrderId: string
): Promise<GerarEtiquetaResult> {
  await requireAdmin()
  try {
    const resultado = await generateLabel([meOrderId])

    // Fila do ME não é erro. Devolver como falha pintava de vermelho, no card,
    // um estado que só pede alguns minutos — ao lado de erros de verdade.
    if (!resultado.pronta) {
      return { ok: true, tracking: null, aguardando: true, aviso: resultado.aviso }
    }

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
