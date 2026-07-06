'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { restoreStockByOrderId } from '@/lib/server/orders'
import { getStoreSettings } from '@/lib/server/store-settings'
import { revalidatePath } from 'next/cache'
import {
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled,
} from '@/lib/integrations/resend'

export type { OrderFormData, OrderLineItem } from '@/lib/server/orders'

// ─── Atualizar status de pedido (varejo e atacado) ───────────────────────────

export type UpdateOrderStatusResult =
  | { success: true }
  | { success: false; error: string }

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<UpdateOrderStatusResult> {
  await requireAdmin()
  const supabase = createServiceClient()

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

  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
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
