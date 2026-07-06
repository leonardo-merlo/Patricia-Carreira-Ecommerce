'use server'

import { requireAdmin } from '@/lib/server/auth'
import {
  emitirNfe as emitirNfeCore,
  cancelarNfe as cancelarNfeCore,
  type NfeActionResult,
} from '@/lib/server/nfe'

// Wrappers autorizados para o painel admin. A lógica vive em lib/server/nfe.ts,
// que também é usada pelos webhooks (sem sessão de usuário).

export async function emitirNfe(orderId: string): Promise<NfeActionResult> {
  await requireAdmin()
  return emitirNfeCore(orderId)
}

export async function cancelarNfe(orderId: string): Promise<NfeActionResult> {
  await requireAdmin()
  return cancelarNfeCore(orderId)
}
