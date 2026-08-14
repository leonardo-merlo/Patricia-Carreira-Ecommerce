"use client" // sessionStorage (dados do PIX/boleto) e copiar para a área de transferência

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle2, Copy, Check, Clock, AlertCircle, XCircle, ExternalLink, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { PaymentData } from "@/lib/actions/payments"
import type { PublicOrder } from "@/lib/actions/orders"

type Aparencia = {
  icone: typeof CheckCircle2
  cor: string
  titulo: string
  descricao: string
}

// O banco é a fonte de verdade do status. Antes esta tela lia só o sessionStorage
// e dizia "Seu pagamento foi processado com sucesso" para qualquer cartão — até
// para os recusados, porque nada conferia o resultado real do pagamento.
function descreverPedido(order: PublicOrder): Aparencia {
  if (order.paymentStatus === "failed") {
    return {
      icone: XCircle,
      cor: "text-error",
      titulo: "Pagamento não autorizado",
      descricao:
        "Este pedido não foi concluído porque o pagamento foi recusado. Nada foi cobrado e nenhum item foi reservado.",
    }
  }

  if (order.paymentStatus === "paid") {
    if (order.status === "delivered") {
      return {
        icone: CheckCircle2,
        cor: "text-tertiary",
        titulo: "Pedido entregue",
        descricao: "Seu pedido foi entregue. Obrigada pela compra!",
      }
    }
    if (order.status === "shipped") {
      return {
        icone: Truck,
        cor: "text-tertiary",
        titulo: "Pedido a caminho",
        descricao: "Seu pedido saiu para entrega. Acompanhe pelo código de rastreio abaixo.",
      }
    }
    return {
      icone: CheckCircle2,
      cor: "text-tertiary",
      titulo: "Pagamento aprovado!",
      descricao:
        "Seu pagamento foi confirmado. Você receberá a confirmação por e-mail em instantes.",
    }
  }

  if (order.status === "cancelled") {
    return {
      icone: XCircle,
      cor: "text-error",
      titulo: "Pedido cancelado",
      descricao: "Este pedido foi cancelado.",
    }
  }

  return {
    icone: Clock,
    cor: "text-primary",
    titulo: "Aguardando pagamento",
    descricao:
      "Seu pedido foi registrado e será preparado assim que o pagamento for confirmado.",
  }
}

export function PedidoClient({ order }: { order: PublicOrder }) {
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [barcodeCopied, setBarcodeCopied] = useState(false)

  useEffect(() => {
    // Mantém os dados de pagamento na sessão enquanto pendente: se o cliente
    // recarregar a página, o QR Code PIX / boleto continua visível.
    const stored = sessionStorage.getItem("mp_payment")
    if (!stored) return
    try {
      setPayment(JSON.parse(stored) as PaymentData)
    } catch {
      sessionStorage.removeItem("mp_payment")
    }
  }, [])

  useEffect(() => {
    // Uma vez pago, o QR não serve mais para nada e não deve sobreviver à sessão.
    if (order.paymentStatus === "paid") sessionStorage.removeItem("mp_payment")
  }, [order.paymentStatus])

  function copyToClipboard(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  const aparencia = descreverPedido(order)
  const Icone = aparencia.icone
  const aguardandoPagamento = order.paymentStatus === "pending"
  const recusado = order.paymentStatus === "failed"

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-12 md:px-margin-desktop">
      <div className="mx-auto max-w-lg">

        {/* Cabeçalho */}
        <div className="mb-8 text-center">
          <Icone className={`mx-auto h-14 w-14 ${aparencia.cor}`} />
          <h1 className="mt-4 font-headline-md text-headline-md text-on-surface">
            {aparencia.titulo}
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Pedido <span className="font-label-md text-on-surface">#{order.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <Separator />

        <div className="mt-8 rounded-lg border border-outline-variant bg-surface-container-low p-6">
          <p className="font-body-md text-body-md text-on-surface-variant">
            {aparencia.descricao}
          </p>
        </div>

        {recusado && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="flex-1" id="btn-tentar-novamente">
              <Link href="/carrinho">Tentar novamente</Link>
            </Button>
          </div>
        )}

        {/* Código de rastreio */}
        {order.trackingCode && (
          <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
            <p className="mb-1 font-label-md text-label-md text-on-surface-variant">
              Código de rastreio
            </p>
            <p className="font-body-md text-body-md text-on-surface tracking-wider">
              {order.trackingCode}
            </p>
          </div>
        )}

        {/* PIX — só enquanto o pagamento não caiu */}
        {aguardandoPagamento && payment?.method === "pix" && (
          <div className="mt-8 flex flex-col gap-4">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <p className="font-label-md text-label-md text-on-surface">
                  Pague agora para confirmar seu pedido
                </p>
              </div>
              <p className="font-caption text-caption text-on-surface-variant">
                O código PIX expira em <strong>30 minutos</strong>. Após o pagamento, você receberá confirmação por e-mail.
              </p>
            </div>

            {payment?.pixQrBase64 && (
              <div className="flex justify-center">
                <div className="relative h-48 w-48 rounded-lg border border-outline-variant bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${payment.pixQrBase64}`}
                    alt="QR Code PIX"
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}

            {payment?.pixCode && (
              <div>
                <p className="mb-2 font-label-md text-label-md text-on-surface-variant">
                  Código PIX (Copia e Cola)
                </p>
                <div className="flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                  <p className="flex-1 break-all font-caption text-caption text-on-surface-variant leading-relaxed">
                    {payment.pixCode}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => copyToClipboard(payment.pixCode!, setPixCopied)}
                  id="btn-copiar-pix"
                >
                  {pixCopied ? (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Copiado!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Copy className="h-4 w-4" /> Copiar código PIX
                    </span>
                  )}
                </Button>
              </div>
            )}

            <p className="font-caption text-caption text-on-surface-variant text-center">
              Abra o app do seu banco → PIX → Copia e Cola → cole o código acima
            </p>
          </div>
        )}

        {/* Boleto — só enquanto o pagamento não caiu */}
        {aguardandoPagamento && payment?.method === "boleto" && (
          <div className="mt-8 flex flex-col gap-4">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <p className="font-label-md text-label-md text-on-surface">
                  Boleto gerado com sucesso
                </p>
              </div>
              <p className="font-caption text-caption text-on-surface-variant">
                Válido por <strong>3 dias úteis</strong>. O pedido só é processado após a compensação do pagamento (1–2 dias úteis).
              </p>
            </div>

            {payment?.boletoBarcode && (
              <div>
                <p className="mb-2 font-label-md text-label-md text-on-surface-variant">
                  Linha digitável
                </p>
                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                  <p className="font-caption text-caption text-on-surface tracking-wider break-all">
                    {payment.boletoBarcode}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => copyToClipboard(payment.boletoBarcode!, setBarcodeCopied)}
                  id="btn-copiar-boleto"
                >
                  {barcodeCopied ? (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Copiado!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Copy className="h-4 w-4" /> Copiar linha digitável
                    </span>
                  )}
                </Button>
              </div>
            )}

            {payment?.boletoUrl && (
              <Button asChild className="w-full" id="btn-baixar-boleto">
                <a href={payment.boletoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir boleto (PDF)
                </a>
              </Button>
            )}
          </div>
        )}

        {!recusado && (
          <>
            <Separator className="my-8" />

            <div className="flex flex-col gap-3">
              <p className="font-label-md text-label-md text-on-surface-variant">
                Próximos passos
              </p>
              <ul className="flex flex-col gap-2 font-body-md text-body-md text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Você receberá um e-mail de confirmação do pedido
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Seu pedido será preparado em 1–2 dias úteis após a confirmação do pagamento
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Você receberá o código de rastreio quando o pedido for enviado
                </li>
              </ul>
            </div>
          </>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" variant={recusado ? "outline" : "default"}>
            <Link href="/">Continuar comprando</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/conta/pedidos">Ver meus pedidos</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
