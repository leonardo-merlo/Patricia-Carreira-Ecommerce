'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { createManualProductionOrder } from '@/lib/actions/production'
import { getStoreSettings } from '@/lib/actions/settings'

export type WholesaleOrderLineItem = {
  variant_id: string
  product_name: string
  variant_label: string
  quantity: number
  unit_price: number
}

export type BomItemCheck = {
  material_id: string
  material_name: string
  material_type: 'bruta' | 'intermediaria'
  unit: string
  needed_per_unit: number
  needed_total: number
  available: number
  is_sufficient: boolean
  missing: number
  recipe_check?: BomItemCheck[]
}

export type PurchaseItem = {
  material_id: string
  material_name: string
  quantity_to_buy: number
  unit: string
}

export type ItemCheckResult = {
  variant_id: string
  product_name: string
  variant_label: string
  sku: string
  quantity_requested: number
  stock_available: number
  quantity_from_stock: number
  quantity_to_produce: number
  scenario: 'A' | 'B' | 'C' | 'D'
  scenario_label: string
  bom_check: BomItemCheck[]
  items_to_purchase: PurchaseItem[]
}

type CreateWholesaleOrderInput = {
  customer_id: string
  notes: string
  items: WholesaleOrderLineItem[]
}

export type CreateWholesaleOrderResult =
  | { success: true; order_id: string; check: ItemCheckResult[] }
  | { success: false; error: string }

export async function createWholesaleOrder(
  input: CreateWholesaleOrderInput,
): Promise<CreateWholesaleOrderResult> {
  const supabase = createServiceClient()

  const wsSettings = await getStoreSettings().catch(() => null)
  if (wsSettings?.allow_wholesale_no_stock === false) {
    for (const item of input.items) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', item.variant_id)
        .maybeSingle()
      if (!variant || variant.stock_quantity < item.quantity) {
        return {
          success: false,
          error: `"${item.product_name} — ${item.variant_label}" não tem estoque suficiente (pedido sem estoque desabilitado nas configurações).`,
        }
      }
    }
  }

  const total = input.items.reduce((s, it) => s + it.unit_price * it.quantity, 0)

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: input.customer_id,
      type: 'wholesale',
      status: 'pending',
      total_amount: total,
      payment_status: 'pending',
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (orderErr || !order) {
    return { success: false, error: orderErr?.message ?? 'Erro ao criar pedido' }
  }

  const { error: itemsErr } = await supabase.from('order_items').insert(
    input.items.map((it) => ({
      order_id: order.id,
      product_variant_id: it.variant_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      product_name: `${it.product_name} — ${it.variant_label}`,
    })),
  )

  if (itemsErr) {
    return { success: false, error: itemsErr.message }
  }

  const check = await Promise.all(
    input.items.map((it) => checkItemAvailability(supabase, it.variant_id, it.quantity)),
  )

  for (const itemCheck of check) {
    if (itemCheck.quantity_to_produce > 0 && (itemCheck.scenario === 'B' || itemCheck.scenario === 'C')) {
      try {
        await createManualProductionOrder({
          product_variant_id: itemCheck.variant_id,
          quantity: itemCheck.quantity_to_produce,
          order_id: order.id,
          notes: null,
        })
      } catch (err) {
        console.error('[createWholesaleOrder] Falha ao criar OP para variante', itemCheck.variant_id, err)
        // Continua — pedido já foi criado, OP pode ser criada manualmente no painel
      }
    }
  }

  // Decrementa estoque de variantes com quantidade disponível em stock
  for (const itemCheck of check) {
    if (itemCheck.quantity_from_stock > 0) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', itemCheck.variant_id)
        .single()

      if (variant) {
        const before = Number(variant.stock_quantity)
        const after = Math.max(0, before - itemCheck.quantity_from_stock)

        await supabase
          .from('product_variants')
          .update({ stock_quantity: after })
          .eq('id', itemCheck.variant_id)

        await supabase.from('stock_adjustments').insert({
          target: 'product_variant',
          target_id: itemCheck.variant_id,
          quantity_before: before,
          quantity_after: after,
          delta: -(itemCheck.quantity_from_stock),
          reason: 'venda',
          notes: `Pedido atacado ${order.id.slice(-6).toUpperCase()}`,
          created_by: 'henrique',
        })
      }
    }
  }

  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/estoque')

  return { success: true, order_id: order.id, check }
}

// ─── Preview sem salvar (para mostrar sugestões de OP antes de confirmar) ────

export type PreviewOrderInput = {
  items: Array<{ variant_id: string; quantity: number }>
}

export type PreviewOrderResult =
  | { success: true; check: ItemCheckResult[] }
  | { success: false; error: string }

export async function previewOrderCheck(input: PreviewOrderInput): Promise<PreviewOrderResult> {
  const supabase = createServiceClient()
  try {
    const check = await Promise.all(
      input.items.map((it) => checkItemAvailability(supabase, it.variant_id, it.quantity)),
    )
    return { success: true, check }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Verificação de materiais ─────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createServiceClient>

async function checkItemAvailability(
  supabase: SupabaseClient,
  variantId: string,
  qty: number,
): Promise<ItemCheckResult> {
  type VariantRaw = {
    id: string; sku: string; size: string | null; color: string | null; stock_quantity: string
    product: { name: string } | null
  }
  const { data: variantData } = await supabase
    .from('product_variants')
    .select('id, sku, size, color, stock_quantity, product:products(name)')
    .eq('id', variantId)
    .single()

  const variant = variantData as unknown as VariantRaw | null
  if (!variant) {
    return makeErrorResult(variantId, qty)
  }

  const productName = variant.product?.name ?? 'Produto'
  const variantLabel = [variant.color, variant.size].filter(Boolean).join(' — ') || 'Único'
  const stock = Number(variant.stock_quantity)
  const fromStock = Math.min(stock, qty)
  const deficit = qty - fromStock

  if (deficit === 0) {
    return {
      variant_id: variantId,
      product_name: productName,
      variant_label: variantLabel,
      sku: variant.sku,
      quantity_requested: qty,
      stock_available: stock,
      quantity_from_stock: fromStock,
      quantity_to_produce: 0,
      scenario: 'A',
      scenario_label: 'Estoque disponível',
      bom_check: [],
      items_to_purchase: [],
    }
  }

  // Duas queries separadas para evitar dependência do cache de schema do PostgREST
  const { data: bomRows } = await supabase
    .from('bill_of_materials')
    .select('quantity_needed, raw_material_id')
    .eq('product_variant_id', variantId)

  if (!bomRows || bomRows.length === 0) {
    return {
      variant_id: variantId,
      product_name: productName,
      variant_label: variantLabel,
      sku: variant.sku,
      quantity_requested: qty,
      stock_available: stock,
      quantity_from_stock: fromStock,
      quantity_to_produce: deficit,
      scenario: 'D',
      scenario_label: 'Sem receita cadastrada — não é possível produzir',
      bom_check: [],
      items_to_purchase: [],
    }
  }

  // Busca os raw_materials de todos os itens do BOM em uma query só
  const bomMaterialIds = bomRows.map((r) => r.raw_material_id as string)
  const { data: bomMaterials } = await supabase
    .from('raw_materials')
    .select('id, name, type, unit, stock_quantity')
    .in('id', bomMaterialIds)

  const bomMatMap = new Map(
    (bomMaterials ?? []).map((m) => [m.id as string, m]),
  )

  let canProduceAll = true
  const shortIntermediaries: Array<{ materialId: string; materialName: string; needed: number }> = []
  const bomCheck: BomItemCheck[] = []

  for (const b of bomRows) {
    const mat = bomMatMap.get(b.raw_material_id as string)
    if (!mat) continue

    const needed = Number(b.quantity_needed) * deficit
    const available = Number(mat.stock_quantity)
    const isSufficient = available >= needed
    const missing = Math.max(0, needed - available)

    const check: BomItemCheck = {
      material_id: mat.id as string,
      material_name: mat.name as string,
      material_type: mat.type as 'bruta' | 'intermediaria',
      unit: mat.unit as string,
      needed_per_unit: Number(b.quantity_needed),
      needed_total: needed,
      available,
      is_sufficient: isSufficient,
      missing,
      recipe_check: [],
    }

    if (!isSufficient) {
      if (mat.type === 'intermediaria') {
        // Duas queries separadas para evitar join ambíguo (dois FKs para raw_materials)
        const { data: recipeRows } = await supabase
          .from('raw_material_recipes')
          .select('quantity_needed, input_material_id')
          .eq('output_material_id', mat.id)

        if (!recipeRows || recipeRows.length === 0) {
          canProduceAll = false
        } else {
          const inputIds = recipeRows.map((r) => r.input_material_id as string)
          const { data: inputMats } = await supabase
            .from('raw_materials')
            .select('id, name, unit, stock_quantity')
            .in('id', inputIds)

          const matMap = new Map(
            (inputMats ?? []).map((m) => [m.id as string, m]),
          )

          const recipeCheck: BomItemCheck[] = recipeRows.map((r) => {
            const im = matMap.get(r.input_material_id as string)
            const neededForCorte = Number(r.quantity_needed) * missing
            const bruteAvailable = im ? Number(im.stock_quantity) : 0
            const bruteSuff = im != null && bruteAvailable >= neededForCorte
            if (!bruteSuff) canProduceAll = false
            return {
              material_id: r.input_material_id as string,
              material_name: (im?.name as string) ?? 'Desconhecido',
              material_type: 'bruta' as const,
              unit: (im?.unit as string) ?? '',
              needed_per_unit: Number(r.quantity_needed),
              needed_total: neededForCorte,
              available: bruteAvailable,
              is_sufficient: bruteSuff,
              missing: Math.max(0, neededForCorte - bruteAvailable),
            }
          })

          check.recipe_check = recipeCheck
          shortIntermediaries.push({ materialId: mat.id, materialName: mat.name, needed: missing })
        }
      } else {
        canProduceAll = false
      }
    }

    bomCheck.push(check)
  }

  const allBomSufficient = bomCheck.every((b) => b.is_sufficient)
  const hasShortBruta = bomCheck.some((b) => b.material_type === 'bruta' && !b.is_sufficient)

  let scenario: 'A' | 'B' | 'C' | 'D'
  let scenarioLabel: string
  const itemsToPurchase: PurchaseItem[] = []

  if (allBomSufficient) {
    scenario = 'B'
    scenarioLabel = 'Materiais disponíveis — produção possível'
  } else if (shortIntermediaries.length > 0 && canProduceAll && !hasShortBruta) {
    scenario = 'C'
    scenarioLabel = 'MP intermediária em falta — produção possível com corte'
  } else {
    scenario = 'D'
    scenarioLabel = 'Materiais insuficientes — compra necessária'
    const shortBrutas = bomCheck.filter((b) => b.material_type === 'bruta' && !b.is_sufficient)
    for (const b of shortBrutas) {
      itemsToPurchase.push({
        material_id: b.material_id,
        material_name: b.material_name,
        quantity_to_buy: b.missing,
        unit: b.unit,
      })
    }
    for (const b of bomCheck) {
      if (b.material_type === 'intermediaria' && !b.is_sufficient && b.recipe_check) {
        for (const r of b.recipe_check.filter((rc) => !rc.is_sufficient)) {
          itemsToPurchase.push({
            material_id: r.material_id,
            material_name: r.material_name,
            quantity_to_buy: r.missing,
            unit: r.unit,
          })
        }
      }
    }
  }

  return {
    variant_id: variantId,
    product_name: productName,
    variant_label: variantLabel,
    sku: variant.sku,
    quantity_requested: qty,
    stock_available: stock,
    quantity_from_stock: fromStock,
    quantity_to_produce: deficit,
    scenario,
    scenario_label: scenarioLabel,
    bom_check: bomCheck,
    items_to_purchase: itemsToPurchase,
  }
}

function makeErrorResult(variantId: string, qty: number): ItemCheckResult {
  return {
    variant_id: variantId,
    product_name: 'Variante não encontrada',
    variant_label: '',
    sku: '',
    quantity_requested: qty,
    stock_available: 0,
    quantity_from_stock: 0,
    quantity_to_produce: qty,
    scenario: 'D',
    scenario_label: 'Erro ao verificar variante',
    bom_check: [],
    items_to_purchase: [],
  }
}
