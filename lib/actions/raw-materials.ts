'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'

export type StockEntryResult =
  | { success: true }
  | { success: false; error: string }

export async function registerMaterialEntry(input: {
  material_id: string
  quantity: number
  reason: 'compra' | 'ajuste' | 'devolucao'
  notes: string | null
}): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { data: mat, error: fetchErr } = await supabase
    .from('raw_materials')
    .select('stock_quantity')
    .eq('id', input.material_id)
    .single()

  if (fetchErr || !mat) {
    return { success: false, error: 'Matéria-prima não encontrada' }
  }

  const before = Number(mat.stock_quantity)
  const after = before + input.quantity

  const { error: updateErr } = await supabase
    .from('raw_materials')
    .update({ stock_quantity: after })
    .eq('id', input.material_id)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  const reasonMap: Record<string, string> = {
    compra: 'compra_mp',
    ajuste: 'ajuste_inventario',
    devolucao: 'devolucao',
  }

  await supabase.from('stock_adjustments').insert({
    target: 'raw_material',
    target_id: input.material_id,
    quantity_before: before,
    quantity_after: after,
    delta: input.quantity,
    reason: reasonMap[input.reason],
    notes: input.notes,
    created_by: 'henrique',
  })

  revalidatePath('/admin/materias')

  return { success: true }
}

// ─── Criar matéria-prima ─────────────────────────────────────────────────────

export async function createRawMaterial(input: {
  name: string
  type: 'bruta' | 'intermediaria'
  category: string
  subcategory: string | null
  material_type: string | null
  unit: 'metro' | 'unidade' | 'kg' | 'cm'
  stock_quantity: number
  minimum_stock: number
  cost_per_unit: number | null
  supplier: string | null
  notes: string | null
}): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('raw_materials').insert({
    name: input.name,
    type: input.type,
    category: input.category,
    subcategory: input.subcategory,
    material_type: input.material_type,
    unit: input.unit,
    stock_quantity: input.stock_quantity,
    minimum_stock: input.minimum_stock,
    cost_per_unit: input.cost_per_unit,
    supplier: input.supplier,
    notes: input.notes,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/materias')
  return { success: true }
}

// ─── Bill of Materials ───────────────────────────────────────────────────────

export async function addBOMEntry(input: {
  product_variant_id: string
  raw_material_id: string
  quantity_needed: number
}): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('bill_of_materials').insert({
    product_variant_id: input.product_variant_id,
    raw_material_id: input.raw_material_id,
    quantity_needed: input.quantity_needed,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/materias')
  return { success: true }
}

export async function updateBOMEntry(input: {
  bom_id: string
  quantity_needed: number
}): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('bill_of_materials')
    .update({ quantity_needed: input.quantity_needed })
    .eq('id', input.bom_id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/materias')
  return { success: true }
}

export async function deleteBOMEntry(bomId: string): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('bill_of_materials').delete().eq('id', bomId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/materias')
  return { success: true }
}

// ─── Compras Pendentes ────────────────────────────────────────────────────────

export type PurchaseRequestInput = {
  order_id: string | null
  raw_material_id: string
  material_name: string
  quantity_needed: number
  unit: string
}

export async function createPurchaseRequests(
  requests: PurchaseRequestInput[],
): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('purchase_requests').insert(
    requests.map((r) => ({
      order_id: r.order_id,
      raw_material_id: r.raw_material_id,
      material_name: r.material_name,
      quantity_needed: r.quantity_needed,
      unit: r.unit,
    })),
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/materias')
  return { success: true }
}

export async function receivePurchaseRequest(input: {
  purchase_request_id: string
  raw_material_id: string
  quantity_received: number
}): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { data: mat, error: fetchErr } = await supabase
    .from('raw_materials')
    .select('stock_quantity')
    .eq('id', input.raw_material_id)
    .single()

  if (fetchErr || !mat) {
    return { success: false, error: 'Matéria-prima não encontrada' }
  }

  const before = Number(mat.stock_quantity)
  const after = before + input.quantity_received

  const { error: updateErr } = await supabase
    .from('raw_materials')
    .update({ stock_quantity: after })
    .eq('id', input.raw_material_id)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  const { error: prErr } = await supabase
    .from('purchase_requests')
    .update({ status: 'received' })
    .eq('id', input.purchase_request_id)

  if (prErr) {
    return { success: false, error: prErr.message }
  }

  await supabase.from('stock_adjustments').insert({
    target: 'raw_material',
    target_id: input.raw_material_id,
    quantity_before: before,
    quantity_after: after,
    delta: input.quantity_received,
    reason: 'compra_mp',
    notes: 'Recebimento de compra pendente',
    created_by: 'henrique',
  })

  revalidatePath('/admin/materias')
  return { success: true }
}

export async function cancelPurchaseRequest(id: string): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('purchase_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/materias')
  return { success: true }
}

// ─── Saída manual de estoque ──────────────────────────────────────────────────

export async function registerMaterialExit(input: {
  material_id: string
  quantity: number
  reason: 'perda' | 'ajuste' | 'uso_manual'
  notes: string | null
}): Promise<StockEntryResult> {
  const supabase = createServiceClient()

  const { data: mat, error: fetchErr } = await supabase
    .from('raw_materials')
    .select('stock_quantity')
    .eq('id', input.material_id)
    .single()

  if (fetchErr || !mat) {
    return { success: false, error: 'Matéria-prima não encontrada' }
  }

  const before = Number(mat.stock_quantity)
  const after = before - input.quantity

  if (after < 0) {
    return { success: false, error: `Estoque insuficiente. Disponível: ${before}` }
  }

  const { error: updateErr } = await supabase
    .from('raw_materials')
    .update({ stock_quantity: after })
    .eq('id', input.material_id)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  const reasonMap: Record<string, string> = {
    perda: 'perda',
    ajuste: 'ajuste_inventario',
    uso_manual: 'ajuste_inventario',
  }

  await supabase.from('stock_adjustments').insert({
    target: 'raw_material',
    target_id: input.material_id,
    quantity_before: before,
    quantity_after: after,
    delta: -input.quantity,
    reason: reasonMap[input.reason],
    notes: input.notes,
    created_by: 'henrique',
  })

  revalidatePath('/admin/materias')
  return { success: true }
}
