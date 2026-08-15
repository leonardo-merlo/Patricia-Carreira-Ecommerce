'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { restoreStockByOrderId } from '@/lib/server/orders'
import { getStoreSettings } from '@/lib/server/store-settings'
import { isCancellationReason } from '@/lib/cancellation-reasons'
import { revalidatePath } from 'next/cache'
import {
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled,
} from '@/lib/integrations/resend'

export type { OrderFormData, OrderLineItem } from '@/lib/server/orders'

// ─── Consulta pública de pedido ──────────────────────────────────────────────

/**
 * Dados de um pedido para quem tem o link. Só o que o cliente precisa acompanhar:
 * nada de CPF, endereço ou e-mail, porque a página é aberta sem login.
 */
export type PublicOrder = {
  id: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  trackingCode: string | null
  totalAmount: number
  createdAt: string
}

export async function getPublicOrder(orderId: string): Promise<PublicOrder | null> {
  // O id é uuid: um id inválido não chega a consultar o banco.
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, payment_status, payment_method, tracking_code, total_amount, created_at')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id as string,
    status: (data.status as string) ?? 'pending',
    paymentStatus: (data.payment_status as string) ?? 'pending',
    paymentMethod: (data.payment_method as string | null) ?? null,
    trackingCode: (data.tracking_code as string | null) ?? null,
    totalAmount: Number(data.total_amount ?? 0),
    createdAt: data.created_at as string,
  }
}

// ─── Atualizar status de pedido (varejo e atacado) ───────────────────────────

export type UpdateOrderStatusResult =
  | { success: true }
  | { success: false; error: string }

/** Motivo e observação do cancelamento. Obrigatório na transição para 'cancelled'. */
export type CancellationInput = {
  reason: string
  notes?: string
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  cancellation?: CancellationInput,
): Promise<UpdateOrderStatusResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  // A tela já valida, mas quem decide é o servidor: sem isto, uma chamada direta
  // da action gravaria cancelamento sem motivo e o CHECK do banco recusaria o
  // update inteiro depois do estorno de estoque já ter acontecido.
  if (status === 'cancelled') {
    if (!cancellation || !isCancellationReason(cancellation.reason)) {
      return { success: false, error: 'Informe um motivo de cancelamento válido.' }
    }
  }

  const { data: current } = await supabase
    .from('orders')
    .select('status, payment_status')
    .eq('id', orderId)
    .maybeSingle()

  if (!current) return { success: false, error: 'Pedido não encontrado' }
  if (current.status === status) return { success: true }

  // Cancelamento de pedido pago: estorna o estoque antes de mudar o status
  // (regra de negócio 7). Idempotente — só roda na transição para cancelled.
  if (status === 'cancelled' && current.payment_status === 'paid' && current.status !== 'cancelled') {
    try {
      await restoreStockByOrderId(orderId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao estornar estoque'
      return { success: false, error: `Estorno de estoque falhou: ${msg}` }
    }
  }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'cancelled' && cancellation) {
    patch.cancellation_reason = cancellation.reason
    patch.cancellation_notes = cancellation.notes?.trim() || null
  }

  const { error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/estoque')

  if (status === 'shipped' || status === 'delivered' || status === 'cancelled') {
    try {
      const [settings, orderResult] = await Promise.all([
        getStoreSettings().catch(() => null),
        supabase
          .from('orders')
          .select('tracking_code, shipping_method, customer:customers(name, email)')
          .eq('id', orderId)
          .maybeSingle(),
      ])

      type CustomerRow = { name: string; email: string | null }
      const order = orderResult.data
      const customer = (
        Array.isArray(order?.customer) ? order?.customer[0] : order?.customer
      ) as CustomerRow | null | undefined

      if (customer?.email) {
        if (status === 'shipped' && (settings === null || settings.notif_order_shipped)) {
          await sendOrderShipped({
            to: customer.email,
            customerName: customer.name,
            orderId,
            trackingCode: (order as Record<string, unknown>)?.tracking_code as string ?? '',
            shippingMethod: (order as Record<string, unknown>)?.shipping_method as string | undefined,
          })
        } else if (status === 'delivered' && (settings === null || settings.notif_order_delivered)) {
          await sendOrderDelivered({ to: customer.email, customerName: customer.name, orderId })
        } else if (status === 'cancelled' && (settings === null || settings.notif_order_cancelled)) {
          await sendOrderCancelled({ to: customer.email, customerName: customer.name, orderId })
        }
      }
    } catch (err) {
      console.error('[updateOrderStatus] erro ao enviar email de status:', err)
    }
  }

  return { success: true }
}
