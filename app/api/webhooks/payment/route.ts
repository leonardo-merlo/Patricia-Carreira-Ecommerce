import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { decrementStockByOrderId, flagStockFailure } from '@/lib/server/orders'
import { recordCouponUsage } from '@/lib/supabase/coupons'
import { purchaseShippingLabel } from '@/lib/server/label'
import { emitirNfe } from '@/lib/server/nfe'
import { sendOrderConfirmation } from '@/lib/integrations/resend'
import { getStoreSettings } from '@/lib/server/store-settings'

function validateMPSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return false

  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.split('=').map((s) => s.trim()))
  )
  const ts = parts['ts'] ?? ''
  const v1 = parts['v1'] ?? ''

  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const hmac = createHmac('sha256', secret).update(manifest).digest('hex')

  const expected = Buffer.from(hmac, 'utf8')
  const received = Buffer.from(v1, 'utf8')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') ?? ''

  if (!validateMPSignature(req, dataId)) {
    console.warn('[MP Webhook] assinatura inválida')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // Only process payment events
  if (payload['type'] !== 'payment') {
    return NextResponse.json({ ok: true })
  }

  const paymentId = String((payload['data'] as Record<string, unknown>)?.['id'] ?? dataId)
  if (!paymentId) return NextResponse.json({ ok: true })

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, payment_status, coupon_id, customer_id')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ ok: true })
  }

  // Re-fetch payment status from MP to avoid trusting the webhook payload alone
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  })

  if (!mpRes.ok) {
    console.error('[MP Webhook] falha ao buscar status no MP:', mpRes.status)
    return NextResponse.json({ ok: true })
  }

  const mpPayment = (await mpRes.json()) as Record<string, unknown>
  const mpStatus = mpPayment['status'] as string

  if (mpStatus === 'approved') {
    // Update condicional: só a primeira notificação "reivindica" o pedido.
    // Webhooks do MP chegam em duplicidade/concorrência — sem isso o estoque
    // seria decrementado e o cupom consumido mais de uma vez.
    const { data: claimed } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', status: 'paid' })
      .eq('id', order.id)
      .neq('payment_status', 'paid')
      .select('id')

    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const settings = await getStoreSettings().catch(() => null)

    try {
      await decrementStockByOrderId(order.id)
    } catch (err) {
      console.error('[MP Webhook] erro ao decrementar estoque:', err)
      await flagStockFailure(order.id).catch(() => {})
    }

    if (order.coupon_id) {
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('user_id, email')
          .eq('id', order.customer_id)
          .maybeSingle()

        await recordCouponUsage(
          order.coupon_id,
          order.id,
          customer?.user_id ?? null,
          customer?.email ?? null,
        )
      } catch (err) {
        console.error('[MP Webhook] erro ao registrar uso de cupom:', err)
      }
    }

    try {
      await purchaseShippingLabel(order.id)
    } catch (err) {
      console.error('[MP Webhook] erro ao comprar etiqueta ME:', err)
    }

    if (settings === null || settings.auto_nfe_retail) {
      try {
        await emitirNfe(order.id)
      } catch (err) {
        console.error('[MP Webhook] erro ao emitir NF-e:', err)
      }
    }

    if (settings === null || settings.notif_order_confirmed) {
      try {
        const { data: orderDetails } = await supabase
          .from('orders')
          .select(`
            total_amount, payment_method,
            customer:customers(name, email),
            items:order_items(quantity, unit_price, product_name)
          `)
          .eq('id', order.id)
          .maybeSingle()

        type CustomerRow = { name: string; email: string | null }
        type ItemRow = { quantity: number; unit_price: number; product_name: string }

        const customer = (
          Array.isArray(orderDetails?.customer)
            ? orderDetails?.customer[0]
            : orderDetails?.customer
        ) as CustomerRow | null | undefined

        if (customer?.email) {
          const items = (orderDetails?.items ?? []) as ItemRow[]
          await sendOrderConfirmation({
            to: customer.email,
            customerName: customer.name,
            orderId: order.id,
            totalAmount: Number(orderDetails?.total_amount ?? 0),
            paymentMethod: (orderDetails?.payment_method as string) ?? 'pix',
            items: items.map((i) => ({
              product_name: i.product_name,
              quantity: i.quantity,
              unit_price: Number(i.unit_price),
            })),
          })
        }
      } catch (err) {
        console.error('[MP Webhook] erro ao enviar email de confirmação:', err)
      }
    }
  } else if (mpStatus === 'rejected') {
    await supabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', order.id)
      .neq('payment_status', 'paid')
  }

  return NextResponse.json({ ok: true })
}
