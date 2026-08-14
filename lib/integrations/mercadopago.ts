import { MercadoPagoConfig, Payment } from 'mercadopago'

const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

function notificationUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) return undefined
  return `${base}/api/webhooks/payment`
}

const paymentClient = new Payment(mpConfig)

export type MPPayer = {
  email: string
  firstName: string
  lastName: string
  cpf?: string
}

export type MPPaymentResult = {
  id: string
  status: string
  /** Motivo detalhado do MP — 'accredited', 'cc_rejected_insufficient_amount', etc. */
  statusDetail: string
  pixCode?: string
  pixQrBase64?: string
  boletoUrl?: string
  boletoBarcode?: string
}

// Campos da resposta do MP que o SDK não tipa completamente
type MPCreateResponse = {
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } }
  transaction_details?: { external_resource_url?: string }
  barcode?: { content?: string }
}

export async function createPixPayment(
  amount: number,
  payer: MPPayer
): Promise<MPPaymentResult> {
  const result = await paymentClient.create({
    body: {
      transaction_amount: amount,
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
      },
      description: 'Pedido Patrícia Carreira',
      notification_url: notificationUrl(),
      // Alinhado ao prazo informado na UI de checkout ("expira em 30 minutos")
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  })

  const extra = result as MPCreateResponse
  return {
    id: String(result.id),
    status: result.status ?? 'pending',
    statusDetail: result.status_detail ?? '',
    pixCode: extra.point_of_interaction?.transaction_data?.qr_code,
    pixQrBase64: extra.point_of_interaction?.transaction_data?.qr_code_base64,
  }
}

export async function createBoletoPayment(
  amount: number,
  payer: MPPayer
): Promise<MPPaymentResult> {
  const result = await paymentClient.create({
    body: {
      transaction_amount: amount,
      payment_method_id: 'bolbradesco',
      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
        identification: {
          type: 'CPF',
          number: payer.cpf!.replace(/\D/g, ''),
        },
      },
      description: 'Pedido Patrícia Carreira',
      notification_url: notificationUrl(),
    },
  })

  const extra = result as MPCreateResponse
  return {
    id: String(result.id),
    status: result.status ?? 'pending',
    statusDetail: result.status_detail ?? '',
    boletoUrl: extra.transaction_details?.external_resource_url,
    boletoBarcode: extra.barcode?.content,
  }
}

// O MP devolve o motivo da recusa em status_detail. Sem tradução o cliente vê
// "erro ao processar" e tenta o mesmo cartão de novo; com ela sabe se corrige o
// CVV, troca de cartão ou liga para o banco.
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido. Confira os dígitos e tente de novo.',
  cc_rejected_bad_filled_date: 'Data de validade inválida. Confira e tente de novo.',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido. Confira e tente de novo.',
  cc_rejected_bad_filled_other: 'Algum dado do cartão está incorreto. Confira e tente de novo.',
  cc_rejected_insufficient_amount: 'Cartão sem limite disponível para este valor.',
  cc_rejected_high_risk: 'Pagamento recusado pelo banco. Tente outro cartão ou pague com PIX.',
  cc_rejected_max_attempts: 'Muitas tentativas com este cartão. Tente outro cartão ou aguarde alguns minutos.',
  cc_rejected_call_for_authorize: 'O banco precisa autorizar este valor. Ligue para o banco ou use outro cartão.',
  cc_rejected_card_disabled: 'Cartão desabilitado. Ligue para o banco ou use outro cartão.',
  cc_rejected_duplicated_payment: 'Já existe um pagamento igual a este. Confira seus pedidos antes de tentar de novo.',
  cc_rejected_card_error: 'Não foi possível processar este cartão. Tente outro cartão ou pague com PIX.',
  cc_rejected_invalid_installments: 'Este cartão não aceita o número de parcelas escolhido.',
  cc_rejected_other_reason: 'Pagamento recusado pelo banco. Tente outro cartão ou pague com PIX.',
}

export function describeRejection(statusDetail: string): string {
  return (
    REJECTION_MESSAGES[statusDetail] ??
    'Pagamento não autorizado. Tente outro cartão ou pague com PIX.'
  )
}

export async function createCardPayment(
  amount: number,
  cardToken: string,
  paymentMethodId: string,
  payer: MPPayer,
  installments: number = 1
): Promise<MPPaymentResult> {
  const result = await paymentClient.create({
    body: {
      transaction_amount: amount,
      token: cardToken,
      payment_method_id: paymentMethodId,
      installments,
      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
        ...(payer.cpf && {
          identification: { type: 'CPF', number: payer.cpf.replace(/\D/g, '') },
        }),
      },
      description: 'Pedido Patrícia Carreira',
      notification_url: notificationUrl(),
    },
  })

  return {
    id: String(result.id),
    status: result.status ?? 'pending',
    statusDetail: result.status_detail ?? '',
  }
}
