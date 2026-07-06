import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateLabel, getTrackingCode } from '@/lib/integrations/melhor-envio'

// ME order status → nosso orders.status
const STATUS_MAP: Record<string, string> = {
  released: 'separating',    // checkout aprovado, pronto para gerar etiqueta
  posted: 'shipped',         // postado na transportadora
  delivered: 'delivered',    // entregue ao destinatário
  undelivered: 'shipped',    // tentativa falhou — mantém como enviado
  canceled: 'cancelled',
}

export async function POST(req: NextRequest) {
  // Mesmo esquema do webhook Focus NFe: a URL cadastrada no Melhor Envio deve
  // incluir ?token=<MELHOR_ENVIO_WEBHOOK_SECRET>. Sem isso qualquer pessoa
  // poderia alterar status de pedidos.
  const expectedToken = process.env.MELHOR_ENVIO_WEBHOOK_SECRET
  if (!expectedToken) {
    console.warn('[ME Webhook] MELHOR_ENVIO_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }

  const token = new URL(req.url).searchParams.get('token')
  if (token !== expectedToken) {
    console.warn('[ME Webhook] token inválido')
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const data = payload['data'] as Record<string, unknown> | undefined
  const meOrderId = (data?.['id'] ?? payload['id']) as string | undefined
  const status = data?.['status'] as string | undefined

  if (!meOrderId) return NextResponse.json({ ok: true })

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, tracking_code')
    .eq('melhor_envio_order_id', meOrderId)
    .maybeSingle()

  if (!order) {
    console.log('[ME Webhook] pedido não encontrado para me_order_id:', meOrderId)
    return NextResponse.json({ ok: true })
  }

  // Checkout aprovado no sandbox (~5 min): gera etiqueta automaticamente
  if (status === 'released') {
    try {
      await generateLabel([meOrderId])
      await new Promise((r) => setTimeout(r, 2000))
      const tracking = await getTrackingCode(meOrderId)
      if (tracking) {
        await supabase
          .from('orders')
          .update({ tracking_code: tracking, status: 'separating' })
          .eq('id', order.id)
        console.log('[ME Webhook] etiqueta gerada automaticamente:', tracking)
      }
    } catch (err) {
      console.error('[ME Webhook] erro ao gerar etiqueta após release:', err)
    }
    return NextResponse.json({ ok: true })
  }

  // Demais atualizações de status (postado, entregue, cancelado)
  const newStatus = STATUS_MAP[status ?? '']
  if (newStatus && newStatus !== order.status) {
    const updates: Record<string, string> = { status: newStatus }

    if (!order.tracking_code) {
      const tracking = await getTrackingCode(meOrderId)
      if (tracking) updates.tracking_code = tracking
    }

    await supabase.from('orders').update(updates).eq('id', order.id)
    console.log('[ME Webhook] status atualizado:', order.id, '→', newStatus)
  }

  return NextResponse.json({ ok: true })
}
