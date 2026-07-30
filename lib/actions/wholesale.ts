'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { createManualProductionOrder } from '@/lib/actions/production'
import { getStoreSettings } from '@/lib/server/store-settings'
import { getResolvedBomForVariant } from '@/lib/supabase/bom'

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
  /** Cor exigida pela variante (só nos cortes). */
  required_color: string | null
  /** false = insumo dessa cor ainda não cadastrado — bloqueia a produção. */
  resolved: boolean
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
  await requireAdmin()
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

  // Decrementa estoque de variantes com quantidade disponível — via RPC atômica
  // (decrement_stock usa FOR UPDATE e registra em stock_adjustments), evitando
  // race condition entre venda no e-commerce e pedido atacado simultâneos.
  for (const itemCheck of check) {
    if (itemCheck.quantity_from_stock > 0) {
      const { error: stockErr } = await supabase.rpc('decrement_stock', {
        p_variant_id: itemCheck.variant_id,
        p_quantity: itemCheck.quantity_from_stock,
      })
      if (stockErr) {
        console.error(
          '[createWholesaleOrder] falha ao decrementar estoque da variante',
          itemCheck.variant_id,
          stockErr.message,
        )
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
  await requireAdmin()
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

  // Receita do produto resolvida com as cores desta variante
  const bomRows = await getResolvedBomForVariant(variantId)

  if (bomRows.length === 0) {
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

  const bomCheck: BomItemCheck[] = bomRows.map((line) => {
    const needed = line.quantity_needed * deficit
    const available = line.resolved ? line.stock_quantity : 0
    return {
      material_id: line.raw_material_id ?? '',
      material_name: line.material_name,
      material_type: 'bruta' as const,
      unit: line.unit,
      needed_per_unit: line.quantity_needed,
      needed_total: needed,
      available,
      is_sufficient: line.resolved && available >= needed,
      missing: Math.max(0, needed - available),
      required_color: line.required_color,
      resolved: line.resolved,
      recipe_check: [],
    }
  })

  const unresolved = bomCheck.filter((b) => !b.resolved)
  const allBomSufficient = bomCheck.every((b) => b.is_sufficient)

  let scenario: 'A' | 'B' | 'C' | 'D'
  let scenarioLabel: string
  const itemsToPurchase: PurchaseItem[] = []

  if (allBomSufficient) {
    scenario = 'B'
    scenarioLabel = 'Materiais disponíveis — produção possível'
  } else if (unresolved.length > 0) {
    // Cadastro incompleto, não falta de material: o corte existe na receita mas
    // não há linha de estoque na cor desta variante.
    scenario = 'C'
    scenarioLabel = `Insumo não cadastrado na cor desta variante (${unresolved
      .map((b) => [b.material_name, b.required_color].filter(Boolean).join(' · '))
      .join(', ')})`
  } else {
    scenario = 'D'
    scenarioLabel = 'Materiais insuficientes — compra necessária'
    for (const b of bomCheck.filter((x) => !x.is_sufficient)) {
      itemsToPurchase.push({
        material_id: b.material_id,
        material_name: [b.material_name, b.required_color].filter(Boolean).join(' · '),
        quantity_to_buy: b.missing,
        unit: b.unit,
      })
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
