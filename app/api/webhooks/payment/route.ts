import { NextRequest, NextResponse } from 'next/server'

// Recebe notificações do Mercado Pago sobre mudanças de status de pagamento.
// Quando Supabase estiver integrado: buscar o payment_id, atualizar order.payment_status
// e decrementar estoque (apenas se status === 'approved').
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[MP Webhook]', JSON.stringify(body))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
