import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

// Nome do cliente e nome do produto vêm de formulários — escapar antes de
// interpolar no HTML do email para impedir injeção de tags.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type OrderConfirmationInput = {
  to: string
  customerName: string
  orderId: string
  totalAmount: number
  paymentMethod: string
  items: { product_name: string; quantity: number; unit_price: number }[]
}

const METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  boleto: 'Boleto Bancário',
}

export async function sendOrderConfirmation(input: OrderConfirmationInput): Promise<void> {
  const shortId = input.orderId.slice(0, 8).toUpperCase()
  const total = input.totalAmount.toFixed(2).replace('.', ',')
  const method = METHOD_LABEL[input.paymentMethod] ?? input.paymentMethod
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pedido/${input.orderId}`

  const itemsHtml = input.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 0">${escapeHtml(i.product_name)}</td>
          <td style="padding:6px 0;text-align:center">${i.quantity}</td>
          <td style="padding:6px 0;text-align:right">R$ ${(i.unit_price * i.quantity).toFixed(2).replace('.', ',')}</td>
        </tr>`
    )
    .join('')

  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'

  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY não configurada — email não enviado')
    return
  }

  await resend.emails.send({
    from,
    to: input.to,
    subject: `Pedido #${shortId} confirmado — Patrícia Carreira`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="font-family:sans-serif;color:#1c1c1e;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#1c1c1e">Olá, ${escapeHtml(input.customerName)}! 👋</h2>
        <p>Seu pedido foi recebido com sucesso.</p>

        <table width="100%" style="border-top:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;margin:16px 0;padding:12px 0;border-collapse:collapse">
          <tr style="color:#666;font-size:13px">
            <th style="text-align:left;padding-bottom:8px">Produto</th>
            <th style="text-align:center;padding-bottom:8px">Qtd</th>
            <th style="text-align:right;padding-bottom:8px">Valor</th>
          </tr>
          ${itemsHtml}
        </table>

        <p><strong>Total:</strong> R$ ${total}</p>
        <p><strong>Pagamento:</strong> ${method}</p>
        <p><strong>Pedido:</strong> #${shortId}</p>

        <p style="margin-top:24px">
          <a href="${orderUrl}" style="background:#1c1c1e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Acompanhar pedido
          </a>
        </p>

        <p style="margin-top:32px;font-size:13px;color:#999">
          Qualquer dúvida, entre em contato pelo Instagram
          <a href="https://instagram.com/patriciacarreira" style="color:#999">@patriciacarreira</a>.
        </p>
      </body>
      </html>
    `,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Pedido enviado — com código de rastreio
// ─────────────────────────────────────────────────────────────────────────────

export type OrderShippedInput = {
  to: string
  customerName: string
  orderId: string
  trackingCode: string
  shippingMethod?: string
}

export async function sendOrderShipped(input: OrderShippedInput): Promise<void> {
  const shortId = input.orderId.slice(0, 8).toUpperCase()
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pedido/${input.orderId}`

  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY não configurada — email de envio não enviado')
    return
  }

  await resend.emails.send({
    from,
    to: input.to,
    subject: `Seu pedido #${shortId} foi enviado! — Patrícia Carreira`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="font-family:sans-serif;color:#1c1c1e;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#1c1c1e">Seu pedido está a caminho! 🎉</h2>
        <p>Olá, ${escapeHtml(input.customerName)}! Seu pedido <strong>#${shortId}</strong> foi enviado.</p>

        <div style="margin:20px 0;padding:16px;background:#f5f5f7;border-radius:8px">
          <div style="font-size:12px;color:#666;margin-bottom:4px">CÓDIGO DE RASTREIO</div>
          <div style="font-family:ui-monospace,monospace;font-size:18px;font-weight:700;letter-spacing:0.06em">
            ${escapeHtml(input.trackingCode)}
          </div>
          ${input.shippingMethod ? `<div style="font-size:12px;color:#666;margin-top:4px">${escapeHtml(input.shippingMethod)}</div>` : ''}
        </div>

        <p style="margin-top:24px">
          <a href="${orderUrl}" style="background:#1c1c1e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Acompanhar pedido
          </a>
        </p>

        <p style="margin-top:32px;font-size:13px;color:#999">
          Qualquer dúvida, entre em contato pelo Instagram
          <a href="https://instagram.com/patriciacarreira" style="color:#999">@patriciacarreira</a>.
        </p>
      </body>
      </html>
    `,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Pedido entregue
// ─────────────────────────────────────────────────────────────────────────────

export type OrderDeliveredInput = {
  to: string
  customerName: string
  orderId: string
}

export async function sendOrderDelivered(input: OrderDeliveredInput): Promise<void> {
  const shortId = input.orderId.slice(0, 8).toUpperCase()
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'
  const storeUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY não configurada — email de entrega não enviado')
    return
  }

  await resend.emails.send({
    from,
    to: input.to,
    subject: `Pedido #${shortId} entregue — Patrícia Carreira`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="font-family:sans-serif;color:#1c1c1e;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#1c1c1e">Seu pedido chegou! ✨</h2>
        <p>Olá, ${escapeHtml(input.customerName)}! Seu pedido <strong>#${shortId}</strong> foi entregue.</p>
        <p>Esperamos que você ame suas peças. Se tiver qualquer dúvida sobre trocas ou devoluções,
           é só entrar em contato.</p>

        <p style="margin-top:24px">
          <a href="${storeUrl}" style="background:#1c1c1e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Explorar novidades
          </a>
        </p>

        <p style="margin-top:32px;font-size:13px;color:#999">
          Qualquer dúvida, entre em contato pelo Instagram
          <a href="https://instagram.com/patriciacarreira" style="color:#999">@patriciacarreira</a>.
        </p>
      </body>
      </html>
    `,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Pedido cancelado
// ─────────────────────────────────────────────────────────────────────────────

export type OrderCancelledInput = {
  to: string
  customerName: string
  orderId: string
}

export async function sendOrderCancelled(input: OrderCancelledInput): Promise<void> {
  const shortId = input.orderId.slice(0, 8).toUpperCase()
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'

  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY não configurada — email de cancelamento não enviado')
    return
  }

  await resend.emails.send({
    from,
    to: input.to,
    subject: `Pedido #${shortId} cancelado — Patrícia Carreira`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="font-family:sans-serif;color:#1c1c1e;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#1c1c1e">Seu pedido foi cancelado</h2>
        <p>Olá, ${escapeHtml(input.customerName)}. Seu pedido <strong>#${shortId}</strong> foi cancelado.</p>
        <p>Se o pagamento já foi processado, o estorno será realizado conforme a política da forma de pagamento utilizada.</p>
        <p>Qualquer dúvida, entre em contato pelo Instagram
           <a href="https://instagram.com/patriciacarreira">@patriciacarreira</a>.</p>
      </body>
      </html>
    `,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// NF-e — envia DANFE por email após autorização
// ─────────────────────────────────────────────────────────────────────────────

export type NfeEmailInput = {
  to: string
  customerName: string
  orderId: string
  danfeUrl: string
}

export async function sendNfeEmail(input: NfeEmailInput): Promise<void> {
  const shortId = input.orderId.slice(0, 8).toUpperCase()
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'

  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] RESEND_API_KEY não configurada — email de NF-e não enviado')
    return
  }

  await resend.emails.send({
    from,
    to: input.to,
    subject: `Sua Nota Fiscal — Pedido #${shortId} — Patrícia Carreira`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="font-family:sans-serif;color:#1c1c1e;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#1c1c1e">Olá, ${escapeHtml(input.customerName)}!</h2>
        <p>Sua Nota Fiscal Eletrônica referente ao Pedido <strong>#${shortId}</strong> foi emitida com sucesso.</p>

        <p style="margin-top:24px">
          <a href="${input.danfeUrl}" style="background:#1c1c1e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Baixar DANFE (PDF)
          </a>
        </p>

        <p style="margin-top:32px;font-size:13px;color:#999">
          Qualquer dúvida, entre em contato pelo Instagram
          <a href="https://instagram.com/patriciacarreira" style="color:#999">@patriciacarreira</a>.
        </p>
      </body>
      </html>
    `,
  })
}
