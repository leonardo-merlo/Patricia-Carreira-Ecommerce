'use server'

import { createServiceClient } from '@/lib/supabase/service'
import type { PaymentMethod } from '@/lib/types'
import { recordCouponUsage } from '@/lib/actions/coupons'

export type OrderFormData = {
  name: string
  email: string
  phone: string
  cpf: string
  address: {
    street: string
    number: string
    complement: string | null
    neighborhood: string
    city: string
    state: string
    zip: string
  }
}

export type OrderLineItem = {
  variantId: string
  productName: string
  basePrice: number
  quantity: number
}

type SaveOrderInput = {
  formData: OrderFormData
  lineItems: OrderLineItem[]
  paymentId: string
  paymentMethod: PaymentMethod
  paymentStatus: 'pending' | 'paid'
  totalAmount: number
  shippingAmount: number
  discountAmount: number
  couponId: string | null
  userId: string | null
}

export async function saveOrder(
  input: SaveOrderInput
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const supabase = createServiceClient()

  let customerId: string

  if (input.userId) {
    // Logged-in: find or create customer linked to user account
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', input.userId)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
      // Keep address and phone up to date
      await supabase
        .from('customers')
        .update({
          name: input.formData.name,
          phone: input.formData.phone,
          cpf_cnpj: input.formData.cpf || null,
          address: input.formData.address,
        })
        .eq('id', customerId)
    } else {
      const { data: created, error } = await supabase
        .from('customers')
        .insert({
          user_id: input.userId,
          type: 'retail',
          name: input.formData.name,
          email: input.formData.email,
          phone: input.formData.phone,
          cpf_cnpj: input.formData.cpf || null,
          address: input.formData.address,
        })
        .select('id')
        .single()

      if (error || !created) {
        console.error('[saveOrder] customer insert error:', error)
        return { ok: false, error: 'Erro ao salvar dados do cliente' }
      }
      customerId = created.id
    }
  } else {
    // Guest: deduplicate by email (user_id IS NULL)
    const { data: existing } = input.formData.email
      ? await supabase
          .from('customers')
          .select('id')
          .eq('email', input.formData.email)
          .is('user_id', null)
          .maybeSingle()
      : { data: null }

    if (existing) {
      customerId = existing.id
    } else {
      const { data: created, error } = await supabase
        .from('customers')
        .insert({
          type: 'retail',
          name: input.formData.name,
          email: input.formData.email,
          phone: input.formData.phone,
          cpf_cnpj: input.formData.cpf || null,
          address: input.formData.address,
        })
        .select('id')
        .single()

      if (error || !created) {
        console.error('[saveOrder] customer insert error:', error)
        return { ok: false, error: 'Erro ao salvar dados do cliente' }
      }
      customerId = created.id
    }
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      type: 'retail',
      status: input.paymentStatus === 'paid' ? 'paid' : 'pending',
      total_amount: input.totalAmount,
      discount_amount: input.discountAmount,
      shipping_amount: input.shippingAmount,
      payment_status: input.paymentStatus,
      payment_id: input.paymentId,
      payment_method: input.paymentMethod,
      coupon_id: input.couponId,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[saveOrder] order insert error:', orderError)
    return { ok: false, error: 'Erro ao criar pedido' }
  }

  const itemRows = input.lineItems.map((item) => ({
    order_id: order.id,
    product_variant_id: item.variantId || null,
    quantity: item.quantity,
    unit_price: item.basePrice,
    product_name: item.productName,
  }))

  let { error: itemsError } = await supabase.from('order_items').insert(itemRows)

  // FK violation: variant not in DB (mock data) — retry without the reference
  if (itemsError?.code === '23503') {
    const { error: retryError } = await supabase.from('order_items').insert(
      itemRows.map((row) => ({ ...row, product_variant_id: null }))
    )
    itemsError = retryError
  }

  if (itemsError) {
    console.error('[saveOrder] order_items insert error:', itemsError)
    return { ok: false, error: 'Erro ao salvar itens do pedido' }
  }

  if (input.paymentStatus === 'paid') {
    try {
      await decrementStockFromItems(supabase, input.lineItems)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao decrementar estoque'
      console.error('[saveOrder] stock decrement error:', msg)
      // Order already saved — log but don't fail
    }

    if (input.couponId) {
      try {
        await recordCouponUsage(input.couponId, order.id, input.userId, input.formData.email)
      } catch (err) {
        console.error('[saveOrder] recordCouponUsage error:', err)
      }
    }
  }

  return { ok: true, orderId: order.id }
}

async function decrementStockFromItems(
  supabase: ReturnType<typeof createServiceClient>,
  lineItems: OrderLineItem[]
) {
  for (const item of lineItems) {
    const { error } = await supabase.rpc('decrement_stock', {
      p_variant_id: item.variantId,
      p_quantity: item.quantity,
    })
    if (error) throw new Error(`Estoque insuficiente para variante ${item.variantId}: ${error.message}`)
  }
}

export async function decrementStockByOrderId(orderId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_variant_id, quantity')
    .eq('order_id', orderId)

  if (error) throw new Error(`Erro ao buscar itens do pedido: ${error.message}`)
  if (!items || items.length === 0) return

  for (const item of items) {
    if (!item.product_variant_id) continue
    const { error: rpcError } = await supabase.rpc('decrement_stock', {
      p_variant_id: item.product_variant_id,
      p_quantity: item.quantity,
    })
    if (rpcError) throw new Error(`Falha ao decrementar estoque: ${rpcError.message}`)
  }
}
