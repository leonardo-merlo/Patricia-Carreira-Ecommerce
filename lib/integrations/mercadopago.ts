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
    boletoUrl: extra.transaction_details?.external_resource_url,
    boletoBarcode: extra.barcode?.content,
  }
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
  }
}
