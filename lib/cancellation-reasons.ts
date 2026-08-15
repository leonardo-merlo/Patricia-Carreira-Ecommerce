// Motivos de cancelamento de pedido. Vive fora de lib/actions/orders.ts porque um
// módulo 'use server' só pode exportar funções async — a lista precisa de casa
// própria para ser importada tanto pelo servidor quanto pelas telas.

export const CANCELLATION_REASONS = [
  { value: 'duplicado',          label: 'Pedido duplicado' },
  { value: 'desistencia',        label: 'Cliente desistiu' },
  { value: 'sem_estoque',        label: 'Sem estoque' },
  { value: 'endereco_incorreto', label: 'Endereço incorreto' },
  { value: 'fraude',             label: 'Suspeita de fraude' },
  { value: 'outro',              label: 'Outro' },
] as const

export type CancellationReason = (typeof CANCELLATION_REASONS)[number]['value']

const VALID = new Set<string>(CANCELLATION_REASONS.map((r) => r.value))

export function isCancellationReason(value: string): value is CancellationReason {
  return VALID.has(value)
}

export function cancellationReasonLabel(value: string | null): string | null {
  if (!value) return null
  return CANCELLATION_REASONS.find((r) => r.value === value)?.label ?? value
}
