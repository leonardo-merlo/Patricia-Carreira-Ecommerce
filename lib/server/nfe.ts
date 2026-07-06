import { createServiceClient } from '@/lib/supabase/service'
import {
  emitirNfe as emitirNfeFocus,
  cancelarNfe as cancelarNfeFocus,
  buildNfePayload,
  toNfeStatus,
  type FocusNfeResponse,
  type OrderItemWithProduct,
} from '@/lib/integrations/focus-nfe'
import { sendNfeEmail } from '@/lib/integrations/resend'
import { getStoreSettings } from '@/lib/server/store-settings'
import type { Customer, NfeStatus, Order } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

export type NfeActionResult = { success: boolean; error?: string }

// Shape retornada pelo join orders + customers + order_items + product_variants + products
// Omit overlapping fields from Order so the richer joined types take precedence
type OrderRow = Omit<Order, 'customer' | 'items'> & {
  customer: Customer | null
  items: OrderItemWithProduct[]
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buscar pedido com todos os joins necessários para NF-e
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOrderForNfe(orderId: string): Promise<OrderRow | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, customer:customers(*), items:order_items(*, product_variant:product_variants(*, product:products(*)))'
    )
    .eq('id', orderId)
    .single()

  if (error || !data) return null

  // Supabase retorna os joins tipados como unknown — cast necessário
  return data as unknown as OrderRow
}

// ─────────────────────────────────────────────────────────────────────────────
// emitirNfe — chamado pelo webhook de pagamento (varejo) ou action admin (atacado)
// ─────────────────────────────────────────────────────────────────────────────

export async function emitirNfe(orderId: string): Promise<NfeActionResult> {
  const supabase = createServiceClient()

  // 1. Buscar pedido com joins completos
  const order = await fetchOrderForNfe(orderId)

  // 2. Validar existência
  if (!order) {
    return { success: false, error: `Pedido ${orderId} não encontrado` }
  }

  // 3. Idempotência: já autorizado ou em processamento
  if (order.nfe_status === 'autorizado') {
    return { success: true }
  }
  if (order.nfe_status === 'processando') {
    return { success: true }
  }

  // 4. Validar customer e endereço
  if (!order.customer) {
    return { success: false, error: 'Pedido sem cliente vinculado — impossível emitir NF-e' }
  }
  if (!order.customer.address) {
    return { success: false, error: 'Cliente sem endereço cadastrado — impossível emitir NF-e' }
  }

  // 5. Validar itens carregados
  if (!order.items || order.items.length === 0) {
    return { success: false, error: 'Pedido sem itens — impossível emitir NF-e' }
  }
  const itemsLoaded = order.items.every((i) => i.product_variant?.product)
  if (!itemsLoaded) {
    return {
      success: false,
      error: 'Itens do pedido com dados de produto incompletos — impossível emitir NF-e',
    }
  }

  // 6. Marcar como processando
  await supabase
    .from('orders')
    .update({ nfe_status: 'processando', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  try {
    // 7. Montar payload (pode lançar se NCM ausente)
    // order.customer is guaranteed non-null — checked at step 4 above
    const payload = buildNfePayload(order as unknown as Order, order.items, order.customer!)

    // 8. Chamar a API Focus NFe
    const response: FocusNfeResponse = await emitirNfeFocus(orderId, payload)
    const mappedStatus = toNfeStatus(response.status)

    if (mappedStatus === 'autorizado') {
      // 9a. Autorização síncrona (raro, mas possível em homologação)
      await supabase
        .from('orders')
        .update({
          nfe_status: 'autorizado',
          nfe_number: response.numero,
          nfe_url: response.caminho_danfe,
          nfe_access_key: response.chave_nfe,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
    } else if (mappedStatus === 'processando') {
      // 9b. Resposta assíncrona normal — webhook vai atualizar
      await supabase
        .from('orders')
        .update({ nfe_status: 'processando', updated_at: new Date().toISOString() })
        .eq('id', orderId)
    } else {
      // 9c. Denegado ou erro direto na chamada
      await supabase
        .from('orders')
        .update({ nfe_status: 'erro', updated_at: new Date().toISOString() })
        .eq('id', orderId)
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao emitir NF-e'
    console.error('[emitirNfe] Erro ao emitir NF-e para pedido', orderId, ':', message)

    await supabase
      .from('orders')
      .update({ nfe_status: 'erro', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    return { success: false, error: message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelarNfe — chamado pela action admin ao cancelar pedido com NF-e autorizada
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelarNfe(orderId: string): Promise<NfeActionResult> {
  const supabase = createServiceClient()

  // 1. Buscar pedido
  const { data, error } = await supabase
    .from('orders')
    .select('id, nfe_status')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    return { success: false, error: `Pedido ${orderId} não encontrado` }
  }

  // 2. Verificar que está autorizado
  if ((data as { id: string; nfe_status: NfeStatus }).nfe_status !== 'autorizado') {
    return { success: false, error: 'NF-e não autorizada — somente NF-es autorizadas podem ser canceladas' }
  }

  // 3. Cancelar via API Focus NFe
  try {
    const response = await cancelarNfeFocus(orderId, 'Cancelamento de pedido via sistema')
    const mappedStatus = toNfeStatus(response.status)

    // 4. Verificar que SEFAZ aceitou o cancelamento antes de persistir
    if (mappedStatus !== 'cancelado') {
      return {
        success: false,
        error: `SEFAZ rejeitou cancelamento: ${response.mensagem_sefaz ?? response.status}`,
      }
    }

    // 5. Atualizar status no banco
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ nfe_status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (updateErr) {
      console.error('[cancelarNfe] Erro ao salvar cancelamento:', updateErr)
      return { success: false, error: 'Erro ao salvar cancelamento' }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao cancelar NF-e'
    console.error('[cancelarNfe] Erro ao cancelar NF-e para pedido', orderId, ':', message)
    return { success: false, error: message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// atualizarStatusNfe — chamado pelo webhook Focus NFe para atualizar status
// ─────────────────────────────────────────────────────────────────────────────

export async function atualizarStatusNfe(
  ref: string,
  data: FocusNfeResponse
): Promise<void> {
  const supabase = createServiceClient()

  const mappedStatus = toNfeStatus(data.status)

  // 1. Montar campos a atualizar
  const updateFields: Record<string, string | null> = {
    nfe_status: mappedStatus,
    updated_at: new Date().toISOString(),
  }

  if (mappedStatus === 'autorizado') {
    updateFields['nfe_number'] = data.numero
    updateFields['nfe_url'] = data.caminho_danfe
    updateFields['nfe_access_key'] = data.chave_nfe
  }

  // 2. Persistir no banco
  const { error } = await supabase
    .from('orders')
    .update(updateFields)
    .eq('id', ref)

  if (error) {
    console.error('[atualizarStatusNfe] Erro ao atualizar NF-e do pedido', ref, ':', error.message)
    return
  }

  // 3. Enviar email com DANFE ao cliente se autorizado
  if (mappedStatus === 'autorizado') {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, customer:customers(name, email)')
        .eq('id', ref)
        .single()

      if (orderError || !orderData) {
        console.error('[atualizarStatusNfe] Pedido não encontrado para envio de email:', ref)
        return
      }

      type OrderWithCustomer = { id: string; customer: { name: string; email: string | null } | null }
      const typedOrder = orderData as unknown as OrderWithCustomer

      const customerEmail = typedOrder.customer?.email
      const customerName = typedOrder.customer?.name ?? 'Cliente'
      const danfeUrl = data.caminho_danfe

      const nfeSettings = await getStoreSettings().catch(() => null)
      if ((nfeSettings === null || nfeSettings.send_danfe_email) && customerEmail && danfeUrl) {
        await sendNfeEmail({
          to: customerEmail,
          customerName,
          orderId: ref,
          danfeUrl,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[atualizarStatusNfe] Falha ao enviar email de NF-e para pedido', ref, ':', message)
      // Não relançar — o webhook já processou com sucesso
    }
  }
}
