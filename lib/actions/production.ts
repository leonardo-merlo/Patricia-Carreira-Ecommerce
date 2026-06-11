'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
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
      material:raw_materials(id, name, category, subcategory, material_type, unit, stock_quantity)
    `)
    .eq('product_variant_id', op.product_variant_id)

  if (bomErr) return { success: false, error: bomErr.message }

  if (!bom || bom.length === 0) {
    await supabase
      .from('production_orders')
      .update({ materials_sufficient: true, missing_materials: [], material_checks: {} })
      .eq('id', opId)
    return { success: true }
  }

  type BomRow = {
    quantity_needed: number
    material: {
      id: string; name: string; category: string
      subcategory: string | null; material_type: string | null; unit: string; stock_quantity: number
    } | null
  }

  const missing: MissingMaterialEntry[] = []
  const checksInit: Record<string, boolean> = {}

  for (const row of bom as unknown as BomRow[]) {
    const mat = row.material
    if (!mat) continue

    const needed = row.quantity_needed * op.quantity_requested
    const available = Number(mat.stock_quantity)
    const category = mat.category

    if (!(category in checksInit)) checksInit[category] = false

    if (available >= needed) continue

    let couroBrutoAvailable: number | null = null
    if (category === 'Couro' && mat.subcategory === 'com laser') {
      const brutoQuery = supabase
        .from('raw_materials')
        .select('stock_quantity')
        .eq('category', 'Couro')
        .eq('subcategory', 'bruto')

      if (mat.material_type) {
        brutoQuery.eq('material_type', mat.material_type)
      }

      const { data: bruto } = await brutoQuery.maybeSingle()
      couroBrutoAvailable = bruto ? Number(bruto.stock_quantity) : 0
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

  await supabase
    .from('production_orders')
    .update({
      materials_sufficient: sufficient,
      missing_materials: missing,
      material_checks: checksInit,
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
  category: string,
  checked: boolean,
): Promise<ToggleCheckResult> {
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
    ...(op.material_checks as Record<string, boolean>),
    [category]: checked,
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
