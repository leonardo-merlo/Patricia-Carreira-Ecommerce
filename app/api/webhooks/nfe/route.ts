import { NextRequest, NextResponse } from 'next/server'
import { atualizarStatusNfe } from '@/lib/server/nfe'
import type { FocusNfeResponse } from '@/lib/integrations/focus-nfe'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validar token de autenticação
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const expectedToken = process.env.FOCUS_NFE_WEBHOOK_SECRET

  if (!expectedToken) {
    console.warn('[NFe Webhook] FOCUS_NFE_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }

  if (token !== expectedToken) {
    console.warn('[NFe Webhook] token inválido')
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  // 2. Parse do body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // 3. Extrair ref (= order ID) e validar
  const ref = String(body['ref'] ?? '')
  if (!ref) {
    return NextResponse.json({ error: 'missing ref' }, { status: 400 })
  }

  // 4. Mapear body para FocusNfeResponse
  const data: FocusNfeResponse = {
    status: String(body['status'] ?? '') as FocusNfeResponse['status'],
    numero: (body['numero'] as string | null) ?? null,
    chave_nfe: (body['chave_nfe'] as string | null) ?? null,
    caminho_danfe: (body['caminho_danfe'] as string | null) ?? null,
    caminho_xml: (body['caminho_xml'] as string | null) ?? null,
    mensagem_sefaz: (body['mensagem_sefaz'] as string | null) ?? null,
    numero_protocolo: (body['numero_protocolo'] as string | null) ?? null,
  }

  // 5. Processar — retornar 200 mesmo em erro interno para Focus NFe não reenviar
  try {
    await atualizarStatusNfe(ref, data)
  } catch (err) {
    console.error('[NFe Webhook] erro ao atualizar status:', err)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
