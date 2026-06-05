'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import type { SuggestedOP } from '@/lib/actions/wholesale'

export type CreateOPInput = {
  order_id: string | null
  ops: SuggestedOP[]
}

export type CreateOPResult =
  | { success: true; op_ids: string[] }
  | { success: false; error: string }

export async function createProductionOrders(input: CreateOPInput): Promise<CreateOPResult> {
  const supabase = createServiceClient()
  const opIds: string[] = []

  // Passagem 1: cria OPs de corte e mapeia material_id → op_id
  const corteOpByMaterialId: Record<string, string> = {}

  for (const op of input.ops.filter((o) => o.type === 'corte')) {
    const { data: po, error: poErr } = await supabase
      .from('production_orders')
      .insert({
        order_id: input.order_id,
        type: op.type,
        status: 'draft',
        notes: null,
        created_by: 'henrique',
        depends_on_op_id: null,
      })
      .select('id')
      .single()

    if (poErr || !po) return { success: false, error: poErr?.message ?? 'Erro ao criar OP de corte' }

    const { error: itemErr } = await supabase.from('production_order_items').insert({
      production_order_id: po.id,
      quantity_requested: op.quantity,
      output_material_id: op.output_id,
    })

    if (itemErr) return { success: false, error: itemErr.message }

    corteOpByMaterialId[op.output_id] = po.id
    opIds.push(po.id)
  }

  // Passagem 2: cria OPs de acabamento com depends_on_op_id apontando para o corte correto
  for (const op of input.ops.filter((o) => o.type !== 'corte')) {
    const dependsMaterialId = op.depends_on_material_ids?.[0] ?? null
    const dependsOnOpId = dependsMaterialId ? (corteOpByMaterialId[dependsMaterialId] ?? null) : null

    const { data: po, error: poErr } = await supabase
      .from('production_orders')
      .insert({
        order_id: input.order_id,
        type: op.type,
        status: 'draft',
        notes: null,
        created_by: 'henrique',
        depends_on_op_id: dependsOnOpId,
      })
      .select('id')
      .single()

    if (poErr || !po) return { success: false, error: poErr?.message ?? 'Erro ao criar OP de acabamento' }

    const { error: itemErr } = await supabase.from('production_order_items').insert({
      production_order_id: po.id,
      quantity_requested: op.quantity,
      ...(op.is_for_material
        ? { output_material_id: op.output_id }
        : { product_variant_id: op.output_id }),
    })

    if (itemErr) return { success: false, error: itemErr.message }

    opIds.push(po.id)
  }

  revalidatePath('/admin/producao')
  revalidatePath('/admin/pedidos')

  return { success: true, op_ids: opIds }
}

export async function createManualProductionOrder(input: {
  type: 'corte' | 'acabamento'
  output_id: string
  is_for_material: boolean
  quantity: number
  notes: string | null
}): Promise<CreateOPResult> {
  const supabase = createServiceClient()

  const { data: po, error: poErr } = await supabase
    .from('production_orders')
    .insert({
      type: input.type,
      status: 'draft',
      notes: input.notes,
      created_by: 'henrique',
    })
    .select('id')
    .single()

  if (poErr || !po) {
    return { success: false, error: poErr?.message ?? 'Erro ao criar OP' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemPayload: any = {
    production_order_id: po.id,
    quantity_requested: input.quantity,
    ...(input.is_for_material
      ? { output_material_id: input.output_id }
      : { product_variant_id: input.output_id }),
  }

  const { error: itemErr } = await supabase.from('production_order_items').insert(itemPayload)
  if (itemErr) {
    return { success: false, error: itemErr.message }
  }

  revalidatePath('/admin/producao')
  return { success: true, op_ids: [po.id] }
}

export type AdvanceStatusResult =
  | { success: true; new_status: string }
  | { success: false; error: string }

const STATUS_TRANSITIONS: Record<string, string> = {
  draft: 'approved',
  approved: 'in_progress',
  in_progress: 'completed',
}

export async function advanceProductionOrderStatus(opId: string): Promise<AdvanceStatusResult> {
  const supabase = createServiceClient()

  const { data: op, error: fetchErr } = await supabase
    .from('production_orders')
    .select('status')
    .eq('id', opId)
    .single()

  if (fetchErr || !op) {
    return { success: false, error: 'OP não encontrada' }
  }

  const nextStatus = STATUS_TRANSITIONS[op.status as string]
  if (!nextStatus) {
    return { success: false, error: `Não é possível avançar do status "${op.status}"` }
  }

  const { error: updateErr } = await supabase
    .from('production_orders')
    .update({ status: nextStatus })
    .eq('id', opId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  revalidatePath('/admin/producao')

  return { success: true, new_status: nextStatus }
}

export async function cancelProductionOrder(opId: string): Promise<AdvanceStatusResult> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('production_orders')
    .update({ status: 'cancelled' })
    .eq('id', opId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/producao')

  return { success: true, new_status: 'cancelled' }
}
