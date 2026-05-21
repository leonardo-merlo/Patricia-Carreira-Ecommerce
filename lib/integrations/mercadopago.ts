import { MercadoPagoConfig, Payment } from 'mercadopago'

const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

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
      notification_url: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`
        : undefined,
    },
  })

  return {
    id: String(result.id),
    status: result.status ?? 'pending',
    pixCode: (result as any).point_of_interaction?.transaction_data?.qr_code,
    pixQrBase64: (result as any).point_of_interaction?.transaction_data?.qr_code_base64,
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
      notification_url: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`
        : undefined,
    },
  })

  return {
    id: String(result.id),
    status: result.status ?? 'pending',
    boletoUrl: (result as any).transaction_details?.external_resource_url,
    boletoBarcode: (result as any).barcode?.content,
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
      notification_url: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`
        : undefined,
    },
  })

  return {
    id: String(result.id),
    status: result.status ?? 'pending',
  }
}
