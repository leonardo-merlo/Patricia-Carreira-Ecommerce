"use client" // useSearchParams + copy to clipboard

import { Suspense, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Copy, Check, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const MOCK_PIX_CODE =
  "00020126580014BR.GOV.BCB.PIX0136a1b2c3d4-e5f6-7890-abcd-ef1234567890" +
  "5204000053039865406100.005802BR5916Patricia Carreira6009Arraial do" +
  "6304ABCD"

const MOCK_BARCODE = "34191.79001 01043.510047 91020.150008 8 91230000010000"

type PaymentMethod = "pix" | "credit_card" | "boleto"

function PedidoContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id as string
  const method = (searchParams.get("method") ?? "pix") as PaymentMethod
  const [pixCopied, setPixCopied] = useState(false)
  const [barcodeCopied, setBarcodeCopied] = useState(false)

  function copyToClipboard(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-12 md:px-margin-desktop">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          {method === "credit_card" ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-tertiary" />
          ) : (
            <Clock className="mx-auto h-14 w-14 text-primary" />
          )}
          <h1 className="mt-4 font-headline-md text-headline-md text-on-surface">
            {method === "credit_card" ? "Pagamento aprovado!" : "Pedido criado!"}
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Pedido <span className="font-label-md text-on-surface">#{orderId}</span>
          </p>
        </div>

        <Separator />

        {/* PIX */}
        {method === "pix" && (
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

            <div>
              <p className="mb-2 font-label-md text-label-md text-on-surface-variant">
                Código PIX (Copia e Cola)
              </p>
              <div className="flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                <p className="flex-1 break-all font-caption text-caption text-on-surface-variant leading-relaxed">
                  {MOCK_PIX_CODE}
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => copyToClipboard(MOCK_PIX_CODE, setPixCopied)}
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

            <p className="font-caption text-caption text-on-surface-variant text-center">
              Abra o app do seu banco → PIX → Copia e Cola → cole o código acima
            </p>
          </div>
        )}

        {/* Boleto */}
        {method === "boleto" && (
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

            <div>
              <p className="mb-2 font-label-md text-label-md text-on-surface-variant">
                Linha digitável
              </p>
              <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                <p className="font-caption text-caption text-on-surface tracking-wider">
                  {MOCK_BARCODE}
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => copyToClipboard(MOCK_BARCODE, setBarcodeCopied)}
                id="btn-copiar-boleto"
              >
                {barcodeCopied ? (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> Copiado!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Copy className="h-4 w-4" /> Copiar código de barras
                  </span>
                )}
              </Button>
            </div>

            <Button className="w-full" id="btn-baixar-boleto">
              Baixar boleto (PDF)
            </Button>
          </div>
        )}

        {/* Cartão */}
        {method === "credit_card" && (
          <div className="mt-8 rounded-lg border border-outline-variant bg-surface-container-low p-6">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Seu pagamento foi processado com sucesso. Você receberá a confirmação por e-mail em instantes.
            </p>
          </div>
        )}

        <Separator className="my-8" />

        {/* Próximos passos */}
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

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
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

export default function PedidoPage() {
  return (
    <Suspense>
      <PedidoContent />
    </Suspense>
  )
}
