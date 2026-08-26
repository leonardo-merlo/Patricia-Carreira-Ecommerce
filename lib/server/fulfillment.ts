import { createServiceClient } from '@/lib/supabase/service'
import { decrementStockByOrderId, flagStockFailure } from '@/lib/server/orders'
import { recordCouponUsage } from '@/lib/supabase/coupons'
import { purchaseShippingLabel } from '@/lib/server/label'
import { emitirNfe } from '@/lib/server/nfe'
import { sendOrderConfirmation } from '@/lib/integrations/resend'
import { getStoreSettings } from '@/lib/server/store-settings'

export type FulfillResult = {
  /** false quando outro caminho já processou este pedido (webhook duplicado, cartão + webhook) */
  claimed: boolean
}

type CustomerRow = { name: string; email: string | null }
type ItemRow = { quantity: number; unit_price: number; product_name: string }

/**
 * Tudo que acontece depois que o pagamento é confirmado: baixa de estoque, consumo
 * de cupom, compra da etiqueta no Melhor Envio, emissão da NF-e e email ao cliente.
 *
 * Dois caminhos chegam aqui — o webhook do Mercado Pago (pix/boleto e confirmações
 * tardias de cartão) e a própria action de checkout quando o cartão é aprovado na
 * hora. O update condicional abaixo é o que garante que só um deles executa: quem
 * perder a corrida recebe `claimed: false` e sai sem repetir nada.
 *
 * Cada etapa depois do claim é isolada em try/catch — falha de etiqueta não pode
 * impedir a NF-e, nem falha de NF-e impedir o email de confirmação.
 */
export async function fulfillPaidOrder(orderId: string): Promise<FulfillResult> {
  const supabase = createServiceClient()

  const { data: claimed } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', status: 'paid' })
    .eq('id', orderId)
    .neq('payment_status', 'paid')
    .select('id, coupon_id, customer_id')

  if (!claimed || claimed.length === 0) {
    return { claimed: false }
  }

  const order = claimed[0]
  const settings = await getStoreSettings().catch(() => null)

  try {
    await decrementStockByOrderId(orderId)
  } catch (err) {
    console.error('[fulfillPaidOrder] erro ao decrementar estoque:', err)
    await flagStockFailure(orderId).catch(() => {})
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('user_id, email, name')
    .eq('id', order.customer_id)
    .maybeSingle()

  if (order.coupon_id) {
    try {
      await recordCouponUsage(
        order.coupon_id,
        orderId,
        customer?.user_id ?? null,
        customer?.email ?? null,
      )
    } catch (err) {
      console.error('[fulfillPaidOrder] erro ao registrar uso de cupom:', err)
    }
  }

  try {
    await purchaseShippingLabel(orderId)
  } catch (err) {
    console.error('[fulfillPaidOrder] erro ao comprar etiqueta ME:', err)
  }

  if (settings === null || settings.auto_nfe_retail) {
    try {
      const result = await emitirNfe(orderId)
      if (!result.success) {
        console.error('[fulfillPaidOrder] NF-e não emitida:', result.error)
      }
    } catch (err) {
      console.error('[fulfillPaidOrder] erro ao emitir NF-e:', err)
    }
  }

  if (settings === null || settings.notif_order_confirmed) {
    try {
      await sendConfirmationEmail(orderId, customer as CustomerRow | null)
    } catch (err) {
      console.error('[fulfillPaidOrder] erro ao enviar email de confirmação:', err)
    }
  }

  return { claimed: true }
}

async function sendConfirmationEmail(
  orderId: string,
  customer: CustomerRow | null,
): Promise<void> {
  if (!customer?.email) return

  const supabase = createServiceClient()
  const { data: orderDetails } = await supabase
    .from('orders')
    .select('total_amount, discount_amount, shipping_amount, payment_method, items:order_items(quantity, unit_price, product_name)')
    .eq('id', orderId)
    .maybeSingle()

  const items = (orderDetails?.items ?? []) as ItemRow[]

  await sendOrderConfirmation({
    to: customer.email,
    customerName: customer.name,
    orderId,
    totalAmount: Number(orderDetails?.total_amount ?? 0),
    discountAmount: Number(orderDetails?.discount_amount ?? 0),
    shippingAmount: Number(orderDetails?.shipping_amount ?? 0),
    paymentMethod: (orderDetails?.payment_method as string) ?? 'pix',
    items: items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
    })),
  })
}
