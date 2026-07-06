'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import type { MissingMaterialEntry } from '@/lib/supabase/admin-queries'

export type CreateOPResult =
  | { success: true; op_ids: string[] }
  | { success: false; error: string }

export type CreateManualOPInput = {
  product_variant_id: string
  quantity: number
  order_id: string | null
  notes: string | null
}

export async function createManualProductionOrder(
  input: CreateManualOPInput,
): Promise<CreateOPResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: po, error: poErr } = await supabase
    .from('production_orders')
    .insert({
      product_variant_id: input.product_variant_id,
      quantity_requested: input.quantity,
      order_id: input.order_id,
      status: 'draft',
      notes: input.notes,
      created_by: 'henrique',
    })
    .select('id')
    .single()

  if (poErr || !po) {
    return { success: false, error: poErr?.message ?? 'Erro ao criar OP' }
  }

  await checkAndSetMaterials(po.id)

  revalidatePath('/admin/producao')
  return { success: true, op_ids: [po.id] }
}

export type CheckMaterialsResult =
  | { success: true }
  | { success: false; error: string }

export async function checkAndSetMaterials(opId: string): Promise<CheckMaterialsResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: op, error: opErr } = await supabase
    .from('production_orders')
    .select('product_variant_id, quantity_requested')
    .eq('id', opId)
    .single()

  if (opErr || !op?.product_variant_id) {
    return { success: false, error: 'OP ou variante não encontrada' }
  }

  const { data: bom, error: bomErr } = await supabase
    .from('bill_of_materials')
    .select(`
      quantity_needed,
      material:raw_materials(id, name, category, subcategory, type_specific, unit, stock_quantity)
    `)
    .eq('product_variant_id', op.product_variant_id)

  if (bomErr) return { success: false, error: bomErr.message }

  if (!bom || bom.length === 0) {
    await supabase
      .from('production_orders')
      .update({ materials_sufficient: true, missing_materials: [] })
      .eq('id', opId)
    return { success: true }
  }

  type BomRow = {
    quantity_needed: number
    material: {
      id: string; name: string; category: string
      subcategory: string | null; type_specific: string | null; unit: string; stock_quantity: number
    } | null
  }

  const missing: MissingMaterialEntry[] = []

  for (const row of bom as unknown as BomRow[]) {
    const mat = row.material
    if (!mat) continue

    const needed = row.quantity_needed * op.quantity_requested
    const available = Number(mat.stock_quantity)
    const category = mat.category

    if (available >= needed) continue

    let couroBrutoAvailable: number | null = null
    if (category === 'Couro' && mat.subcategory === 'com laser') {
      const brutoQuery = supabase
        .from('raw_materials')
        .select('stock_quantity')
        .eq('category', 'Couro')
        .eq('subcategory', 'bruto')

      if (mat.type_specific) {
        brutoQuery.eq('type_specific', mat.type_specific)
      }

      // Pode haver mais de um registro de couro bruto (lotes/fornecedores):
      // soma tudo em vez de maybeSingle, que erra com múltiplas linhas.
      const { data: brutoRows } = await brutoQuery
      couroBrutoAvailable = (brutoRows ?? []).reduce(
        (sum, row) => sum + Number(row.stock_quantity),
        0,
      )
    }

    missing.push({
      material_id: mat.id,
      material_name: mat.name,
      category,
      needed,
      available,
      missing: needed - available,
      unit: mat.unit,
      couro_bruto_available: couroBrutoAvailable,
    })
  }

  const sufficient = missing.length === 0

  // Preserva material_checks existente (marcações do Henrique no card/modal).
  await supabase
    .from('production_orders')
    .update({
      materials_sufficient: sufficient,
      missing_materials: missing,
    })
    .eq('id', opId)

  revalidatePath('/admin/producao')
  return { success: true }
}

export type ToggleCheckResult =
  | { success: true }
  | { success: false; error: string }

export async function toggleMaterialCheck(
  opId: string,
  key: string,
  checked: boolean,
): Promise<ToggleCheckResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: op, error: fetchErr } = await supabase
    .from('production_orders')
    .select('material_checks')
    .eq('id', opId)
    .single()

  if (fetchErr || !op) {
    return { success: false, error: 'OP não encontrada' }
  }

  const updated = {
    ...((op.material_checks as Record<string, boolean>) ?? {}),
    [key]: checked,
  }

  const { error: updateErr } = await supabase
    .from('production_orders')
    .update({ material_checks: updated })
    .eq('id', opId)

  if (updateErr) return { success: false, error: updateErr.message }

  revalidatePath('/admin/producao')
  return { success: true }
}

export type AdvanceStatusResult =
  | { success: true; new_status: string }
  | { success: false; error: string }

const STATUS_TRANSITIONS: Record<string, string> = {
  draft: 'approved',
  approved: 'in_progress',
  in_progress: 'completed',
}

// Conclui a OP via função transacional no Postgres: desconta matéria-prima,
// dá entrada no produto acabado e registra em stock_adjustments — ou faz
// rollback e retorna erro se faltar material.
async function completeProductionOrder(
  supabase: ReturnType<typeof createServiceClient>,
  opId: string,
): Promise<AdvanceStatusResult> {
  const { error } = await supabase.rpc('complete_production_order', { p_op_id: opId })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/producao')
  revalidatePath('/admin/materias')
  revalidatePath('/admin/estoque')

  return { success: true, new_status: 'completed' }
}

export async function advanceProductionOrderStatus(opId: string): Promise<AdvanceStatusResult> {
  await requireAdmin()
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

  if (nextStatus === 'completed') {
    return completeProductionOrder(supabase, opId)
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
  await requireAdmin()
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

const VALID_STATUSES = ['draft', 'approved', 'in_progress', 'completed', 'cancelled']

// Move a OP para qualquer status válido (avanço ou retrocesso) — usado pelo
// drag-and-drop do kanban, que permite arrastar o card para frente ou para trás.
export async function setProductionOrderStatus(
  opId: string,
  targetStatus: string,
): Promise<AdvanceStatusResult> {
  await requireAdmin()
  if (!VALID_STATUSES.includes(targetStatus)) {
    return { success: false, error: `Status inválido: ${targetStatus}` }
  }

  const supabase = createServiceClient()

  const { data: op, error: fetchErr } = await supabase
    .from('production_orders')
    .select('status')
    .eq('id', opId)
    .single()

  if (fetchErr || !op) {
    return { success: false, error: 'OP não encontrada' }
  }

  const current = op.status as string
  if (current === targetStatus) {
    return { success: true, new_status: targetStatus }
  }

  // Concluir (inclusive arrastando o card para "Concluído") faz a baixa de estoque.
  if (targetStatus === 'completed') {
    return completeProductionOrder(supabase, opId)
  }

  // Sair de "Concluído" (arrastar de volta) estorna a baixa de estoque.
  if (current === 'completed') {
    const { error } = await supabase.rpc('revert_production_order', {
      p_op_id: opId,
      p_target_status: targetStatus,
    })
    if (error) {
      return { success: false, error: error.message }
    }
    revalidatePath('/admin/producao')
    revalidatePath('/admin/materias')
    revalidatePath('/admin/estoque')
    return { success: true, new_status: targetStatus }
  }

  const { error } = await supabase
    .from('production_orders')
    .update({ status: targetStatus })
    .eq('id', opId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/producao')

  return { success: true, new_status: targetStatus }
}
