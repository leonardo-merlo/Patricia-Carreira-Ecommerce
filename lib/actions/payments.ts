'use server'

import {
  createPixPayment,
  createBoletoPayment,
  createCardPayment,
  type MPPaymentResult,
} from '@/lib/integrations/mercadopago'

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto'

export type CreatePaymentInput = {
  method: PaymentMethod
  amount: number
  payer: { name: string; email: string; cpf?: string }
  cardToken?: string
  paymentMethodId?: string
  installments?: number
}

export type PaymentData = MPPaymentResult & { method: PaymentMethod }

export type CreatePaymentOutput =
  | { ok: true; data: PaymentData }
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

    return { ok: true, data: { ...result, method: input.method } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar pagamento'
    return { ok: false, error: msg }
  }
}
