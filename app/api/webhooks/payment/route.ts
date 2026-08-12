import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { fulfillPaidOrder } from '@/lib/server/fulfillment'

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
    .select('id')
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
    // O claim atômico e todas as etapas de pós-pagamento vivem em fulfillPaidOrder,
    // que também é chamado pelo checkout quando o cartão é aprovado na hora. Webhook
    // duplicado ou corrida com o cartão volta claimed: false e não repete nada.
    const { claimed } = await fulfillPaidOrder(order.id)
    console.log('[MP Webhook] pagamento aprovado:', order.id, claimed ? 'processado' : 'já processado')
  } else if (mpStatus === 'rejected') {
    await supabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', order.id)
      .neq('payment_status', 'paid')
  }

  return NextResponse.json({ ok: true })
}
