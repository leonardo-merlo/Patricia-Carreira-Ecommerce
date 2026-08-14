import { createServiceClient } from '@/lib/supabase/service'
import type { PaymentMethod } from '@/lib/types'

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

export const STOCK_FAILURE_FLAG = '⚠ FALHA NA BAIXA DE ESTOQUE — conferir e ajustar manualmente'

type SaveOrderInput = {
  formData: OrderFormData
  lineItems: OrderLineItem[]
  paymentId: string
  paymentMethod: PaymentMethod
  totalAmount: number
  shippingAmount: number
  discountAmount: number
  shippingMethod: string | null
  melhorEnvioServiceId: number | null
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
    // Convidado: procura por email sem exigir que o cadastro seja de convidado.
    // Antes filtrava por user_id IS NULL, então quem já tinha conta e comprava
    // sem entrar gerava um segundo cadastro com o mesmo email — e o pedido, preso
    // nesse cadastro solto, nunca aparecia em "Meus pedidos". Ordenar com os
    // nulos por último faz o cadastro com conta ganhar quando existirem os dois.
    const { data: matches } = input.formData.email
      ? await supabase
          .from('customers')
          .select('id')
          .eq('email', input.formData.email)
          .order('user_id', { ascending: true, nullsFirst: false })
          .limit(1)
      : { data: null }

    const existing = matches?.[0] ?? null

    if (existing) {
      customerId = existing.id
      // Sem isto, o cadastro da primeira compra congela: quem volta com CPF novo
      // ou mudou de endereço tem os dados descartados em silêncio — e o pedido
      // sai sem CPF para a NF-e e com o endereço antigo na etiqueta.
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

  // O pedido sempre nasce pendente. Quem o marca como pago é fulfillPaidOrder,
  // único lugar que baixa estoque, consome cupom e dispara etiqueta/NF-e/email —
  // tanto para o webhook do MP quanto para o cartão aprovado na hora.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      type: 'retail',
      status: 'pending',
      total_amount: input.totalAmount,
      discount_amount: input.discountAmount,
      shipping_amount: input.shippingAmount,
      shipping_method: input.shippingMethod,
      melhor_envio_service_id: input.melhorEnvioServiceId,
      payment_status: 'pending',
      payment_id: input.paymentId,
      payment_method: input.paymentMethod,
      coupon_id: input.couponId,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[saveOrder] order insert error:', JSON.stringify(orderError))
    return { ok: false, error: 'Erro ao criar pedido' }
  }

  const itemRows = input.lineItems.map((item) => ({
    order_id: order.id,
    product_variant_id: item.variantId || null,
    quantity: item.quantity,
    unit_price: item.basePrice,
    product_name: item.productName,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(itemRows)

  if (itemsError) {
    console.error('[saveOrder] order_items insert error:', itemsError)
    return { ok: false, error: 'Erro ao salvar itens do pedido' }
  }

  return { ok: true, orderId: order.id }
}

// Marca o pedido para conciliação manual quando o pagamento foi confirmado
// mas a baixa de estoque falhou — visível no campo notes em /admin/pedidos.
export async function flagStockFailure(orderId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('orders')
    .select('notes')
    .eq('id', orderId)
    .maybeSingle()

  const existing = (data?.notes as string | null) ?? ''
  if (existing.includes(STOCK_FAILURE_FLAG)) return

  await supabase
    .from('orders')
    .update({ notes: existing ? `${existing}\n${STOCK_FAILURE_FLAG}` : STOCK_FAILURE_FLAG })
    .eq('id', orderId)
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

// Estorna o estoque de todos os itens de um pedido (cancelamento de pedido pago).
export async function restoreStockByOrderId(orderId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_variant_id, quantity')
    .eq('order_id', orderId)

  if (error) throw new Error(`Erro ao buscar itens do pedido: ${error.message}`)
  if (!items || items.length === 0) return

  for (const item of items) {
    if (!item.product_variant_id) continue
    const { error: rpcError } = await supabase.rpc('increment_stock', {
      p_variant_id: item.product_variant_id,
      p_quantity: item.quantity,
      p_reason: 'devolucao',
      p_notes: `Cancelamento do pedido ${orderId.slice(0, 8).toUpperCase()}`,
    })
    if (rpcError) throw new Error(`Falha ao estornar estoque: ${rpcError.message}`)
  }
}
