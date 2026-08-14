'use server'

import {
  createPixPayment,
  createBoletoPayment,
  createCardPayment,
  describeRejection,
  type MPPaymentResult,
} from '@/lib/integrations/mercadopago'
import { saveOrder, type OrderFormData, type OrderLineItem } from '@/lib/server/orders'
import { fulfillPaidOrder } from '@/lib/server/fulfillment'
import { validateCoupon } from '@/lib/actions/coupons'
import { computeCouponDiscount } from '@/lib/supabase/coupons'
import { getShippingOptions } from '@/lib/actions/shipping'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStoreSettings } from '@/lib/server/store-settings'
import type { PaymentMethod } from '@/lib/types'

export type { PaymentMethod } from '@/lib/types'

export type CheckoutItem = {
  variantId: string
  quantity: number
}

export type CreatePaymentInput = {
  method: PaymentMethod
  payer: { name: string; email: string; cpf?: string }
  cardToken?: string
  paymentMethodId?: string
  installments?: number
  orderData: {
    formData: OrderFormData
    items: CheckoutItem[]
    couponCode: string | null
    shipping: { serviceId: number; destCep: string } | null
    // Total exibido ao cliente — usado apenas para detectar preços defasados,
    // nunca como valor cobrado. O valor cobrado é recalculado no servidor.
    expectedTotal: number
  }
}

export type PaymentData = MPPaymentResult & { method: PaymentMethod }

export type CreatePaymentOutput =
  | { ok: true; data: PaymentData; orderId: string }
  | { ok: false; error: string }

type PricedOrder = {
  lineItems: OrderLineItem[]
  subtotal: number
  discountAmount: number
  shippingAmount: number
  shippingMethod: string | null
  total: number
  couponId: string | null
}

// Recalcula todos os valores do pedido a partir do banco — preços, desconto e
// frete vindos do cliente são apenas exibição e nunca entram na cobrança.
async function priceOrder(
  orderData: CreatePaymentInput['orderData']
): Promise<{ ok: true; priced: PricedOrder } | { ok: false; error: string }> {
  if (!orderData.items.length) {
    return { ok: false, error: 'Carrinho vazio.' }
  }

  const supabase = createServiceClient()
  const settings = await getStoreSettings().catch(() => null)

  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('id, size, color, stock_quantity, product:products(name, base_price, is_active)')
    .in('id', orderData.items.map((i) => i.variantId))

  if (error) {
    return { ok: false, error: 'Erro ao validar os produtos do carrinho.' }
  }

  const lineItems: OrderLineItem[] = []
  let subtotal = 0

  for (const item of orderData.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false, error: 'Quantidade inválida no carrinho.' }
    }

    const variant = variants?.find((v) => v.id === item.variantId)
    const productRaw = variant?.product
    const product = (Array.isArray(productRaw) ? productRaw[0] : productRaw) as {
      name: string
      base_price: number
      is_active: boolean
    } | null | undefined

    if (!variant || !product) {
      return { ok: false, error: 'Um dos produtos do carrinho não está mais disponível. Atualize o carrinho.' }
    }
    if (!product.is_active) {
      return { ok: false, error: `"${product.name}" não está mais disponível para compra.` }
    }
    if (settings?.block_sale_zero_stock && Number(variant.stock_quantity) < item.quantity) {
      return { ok: false, error: `"${product.name}" não tem estoque suficiente para a quantidade escolhida.` }
    }

    const basePrice = Number(product.base_price)
    subtotal += basePrice * item.quantity

    const label = [variant.size, variant.color].filter(Boolean).join(' · ')
    lineItems.push({
      variantId: variant.id,
      productName: label ? `${product.name} — ${label}` : product.name,
      basePrice,
      quantity: item.quantity,
    })
  }

  subtotal = Math.round(subtotal * 100) / 100

  // Cupom: revalida e recalcula o desconto no servidor
  let discountAmount = 0
  let couponId: string | null = null
  if (orderData.couponCode) {
    const { coupon, error: couponError } = await validateCoupon(
      orderData.couponCode,
      subtotal,
      orderData.formData.email,
    )
    if (!coupon) {
      return { ok: false, error: couponError ?? 'Cupom inválido ou expirado.' }
    }
    discountAmount = computeCouponDiscount(coupon, subtotal)
    couponId = coupon.id
  }

  // Frete: recotiza no Melhor Envio e aplica a regra de frete grátis do servidor
  let shippingAmount = 0
  let shippingMethod: string | null = null
  if (orderData.shipping) {
    const quote = await getShippingOptions(
      orderData.shipping.destCep,
      orderData.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
    )
    if (!quote.ok) {
      return { ok: false, error: quote.error }
    }

    const option = quote.options.find((o) => o.id === orderData.shipping!.serviceId)
    if (!option) {
      return { ok: false, error: 'A opção de frete selecionada não está mais disponível. Recalcule o frete.' }
    }

    const cheapest = quote.options.reduce((min, o) => (o.price < min.price ? o : min), quote.options[0])
    const isFree = subtotal >= quote.freeShippingThreshold && option.id === cheapest.id
    shippingAmount = isFree ? 0 : option.price
    shippingMethod = option.name
  }

  const total = Math.round(Math.max(0, subtotal - discountAmount + shippingAmount) * 100) / 100

  return {
    ok: true,
    priced: { lineItems, subtotal, discountAmount, shippingAmount, shippingMethod, total, couponId },
  }
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentOutput> {
  const parts = input.payer.name.trim().split(' ')
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ') || firstName

  const endereco = input.orderData.formData.address
  const mpPayer = {
    email: input.payer.email,
    firstName,
    lastName,
    cpf: input.payer.cpf,
    // Só o boleto usa, mas montar aqui mantém um payer só para os três métodos.
    address: {
      zipCode: endereco.zip,
      streetName: endereco.street,
      streetNumber: endereco.number,
      neighborhood: endereco.neighborhood,
      city: endereco.city,
      federalUnit: endereco.state,
    },
  }

  // Detect logged-in user here — createPayment is called directly from the client
  // so cookies() is reliably available at this level
  let userId: string | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // proceed as guest if auth detection fails
  }

  const pricedResult = await priceOrder(input.orderData)
  if (!pricedResult.ok) return pricedResult
  const priced = pricedResult.priced

  // Se o total exibido ao cliente divergir do recalculado (preço alterado,
  // cupom expirado, frete atualizado), interrompe antes de cobrar.
  if (Math.abs(priced.total - input.orderData.expectedTotal) > 0.01) {
    return {
      ok: false,
      error: 'Os valores do carrinho foram atualizados. Recarregue a página e confira o total antes de finalizar.',
    }
  }

  if (priced.total <= 0) {
    return { ok: false, error: 'Valor do pedido inválido.' }
  }

  try {
    let result: MPPaymentResult

    if (input.method === 'pix') {
      result = await createPixPayment(priced.total, mpPayer)
    } else if (input.method === 'boleto') {
      if (!input.payer.cpf) throw new Error('CPF obrigatório para boleto')
      result = await createBoletoPayment(priced.total, mpPayer)
    } else {
      if (!input.cardToken) throw new Error('Token do cartão não informado')
      if (!input.paymentMethodId) throw new Error('Bandeira do cartão não identificada')
      result = await createCardPayment(
        priced.total,
        input.cardToken,
        input.paymentMethodId,
        mpPayer,
        input.installments ?? 1
      )
    }

    // O MP recusa na própria criação: cartão sem limite, CVV errado, antifraude.
    // Sem esta checagem o pedido era gravado como pendente e o checkout mostrava
    // tela de sucesso — carrinho limpo, cliente achando que comprou, nada cobrado.
    const rejected = result.status === 'rejected' || result.status === 'cancelled'

    // O pedido nasce pendente. Cartão costuma voltar 'approved' já na criação: nesse
    // caso o pós-pagamento roda aqui, porque o webhook do MP chegaria depois (ou nem
    // chegaria) e o cliente não pode ficar sem etiqueta, nota e email por causa disso.
    let orderId = result.id
    const saved = await saveOrder({
      formData: input.orderData.formData,
      lineItems: priced.lineItems,
      paymentId: result.id,
      paymentMethod: input.method,
      totalAmount: priced.total,
      shippingAmount: priced.shippingAmount,
      shippingMethod: priced.shippingMethod,
      melhorEnvioServiceId: input.orderData.shipping?.serviceId ?? null,
      discountAmount: priced.discountAmount,
      couponId: priced.couponId,
      userId,
      // Recusa vira rastro da tentativa, não pedido a atender.
      paymentStatus: rejected ? 'failed' : 'pending',
    })
    if (saved.ok) {
      orderId = saved.orderId

      if (result.status === 'approved') {
        try {
          await fulfillPaidOrder(saved.orderId)
        } catch (err) {
          console.error('[createPayment] erro no pós-pagamento:', err)
          // Pagamento já foi aprovado — não bloquear o cliente. O webhook do MP
          // ainda pode reprocessar, e o pedido fica visível no painel.
        }
      }
    } else {
      console.error('[createPayment] saveOrder failed:', saved.error)
      // Payment processed — don't block the user but log for manual reconciliation
    }

    if (rejected) {
      // Volta como erro para o checkout manter o carrinho e deixar a cliente
      // corrigir o cartão sem remontar o pedido.
      return { ok: false, error: describeRejection(result.statusDetail) }
    }

    return { ok: true, data: { ...result, method: input.method }, orderId }
  } catch (err) {
    console.error('[createPayment] erro:', err)
    let msg = 'Erro ao processar pagamento'
    if (err instanceof Error) {
      msg = err.message
    } else if (err && typeof err === 'object') {
      const mpErr = err as Record<string, unknown>
      msg = (mpErr.message as string) ?? (mpErr.error as string) ?? msg
    }
    return { ok: false, error: msg }
  }
}
