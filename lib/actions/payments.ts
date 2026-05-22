'use server'

import {
  createPixPayment,
  createBoletoPayment,
  createCardPayment,
  type MPPaymentResult,
} from '@/lib/integrations/mercadopago'
import { saveOrder, type OrderFormData, type OrderLineItem } from '@/lib/actions/orders'
import { sendOrderConfirmation } from '@/lib/integrations/resend'
import { createClient } from '@/lib/supabase/server'

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto'

export type CreatePaymentInput = {
  method: PaymentMethod
  amount: number
  payer: { name: string; email: string; cpf?: string }
  cardToken?: string
  paymentMethodId?: string
  installments?: number
  orderData?: {
    formData: OrderFormData
    lineItems: OrderLineItem[]
    discountAmount: number
    shippingAmount: number
    couponId: string | null
  }
}

export type PaymentData = MPPaymentResult & { method: PaymentMethod }

export type CreatePaymentOutput =
  | { ok: true; data: PaymentData; orderId: string }
  | { ok: false; error: string }

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentOutput> {
  const parts = input.payer.name.trim().split(' ')
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ') || firstName

  const mpPayer = {
    email: input.payer.email,
    firstName,
    lastName,
    cpf: input.payer.cpf,
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

  console.log('[createPayment] method:', input.method, 'amount:', input.amount, 'userId:', userId)

  try {
    let result: MPPaymentResult

    if (input.method === 'pix') {
      result = await createPixPayment(input.amount, mpPayer)
    } else if (input.method === 'boleto') {
      if (!input.payer.cpf) throw new Error('CPF obrigatório para boleto')
      result = await createBoletoPayment(input.amount, mpPayer)
    } else {
      if (!input.cardToken) throw new Error('Token do cartão não informado')
      if (!input.paymentMethodId) throw new Error('Bandeira do cartão não identificada')
      result = await createCardPayment(
        input.amount,
        input.cardToken,
        input.paymentMethodId,
        mpPayer,
        input.installments ?? 1
      )
    }

    // Save order to DB and decrement stock (for card, immediately; for pix/boleto, on webhook)
    let orderId = result.id
    if (input.orderData) {
      const saved = await saveOrder({
        formData: input.orderData.formData,
        lineItems: input.orderData.lineItems,
        paymentId: result.id,
        paymentMethod: input.method,
        paymentStatus: result.status === 'approved' ? 'paid' : 'pending',
        totalAmount: input.amount,
        shippingAmount: input.orderData.shippingAmount,
        discountAmount: input.orderData.discountAmount,
        couponId: input.orderData.couponId,
        userId,
      })
      if (saved.ok) {
        orderId = saved.orderId
        if (input.orderData.formData.email) {
          sendOrderConfirmation({
            to: input.orderData.formData.email,
            customerName: input.orderData.formData.name,
            orderId: saved.orderId,
            totalAmount: input.amount,
            paymentMethod: input.method,
            items: input.orderData.lineItems.map((i) => ({
              product_name: i.productName,
              quantity: i.quantity,
              unit_price: i.basePrice,
            })),
          }).catch((err) => console.error('[createPayment] email error:', err))
        }
      } else {
        console.error('[createPayment] saveOrder failed:', saved.error)
        // Payment processed — don't block the user but log for manual reconciliation
      }
    }

    return { ok: true, data: { ...result, method: input.method }, orderId }
  } catch (err) {
    console.error('[createPayment] erro:', JSON.stringify(err, null, 2))
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
