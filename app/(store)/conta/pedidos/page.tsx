import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShoppingBag, ChevronRight, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Meus Pedidos | Patrícia Carreira",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  separating: "Separando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  separating: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de crédito",
  boleto: "Boleto",
}

export default async function PedidosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/conta/entrar?next=/conta/pedidos")

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      payment_status,
      payment_method,
      total_amount,
      created_at,
      order_items (
        product_name,
        quantity,
        unit_price
      )
    `
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[PedidosPage] error:", error)
  }

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/conta" aria-label="Voltar para minha conta">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Minha conta
          </p>
          <h1 className="mt-1 font-headline-lg text-on-surface">
            Meus pedidos
          </h1>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Lista vazia */}
      {(!orders || orders.length === 0) && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <ShoppingBag className="h-8 w-8 text-on-surface-variant" />
          </div>
          <p className="font-headline-sm text-headline-sm text-on-surface">
            Nenhum pedido ainda
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Seus pedidos aparecerão aqui após a primeira compra.
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/">Explorar produtos</Link>
          </Button>
        </div>
      )}

      {/* Pedidos */}
      {orders && orders.length > 0 && (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const shortId = order.id.slice(0, 8).toUpperCase()
            const date = new Date(order.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
            const statusLabel = STATUS_LABEL[order.status] ?? order.status
            const statusColor =
              STATUS_COLOR[order.status] ?? "bg-surface-container text-on-surface-variant"
            const items = order.order_items ?? []
            const firstItem = items[0]
            const extraCount = items.length - 1

            return (
              <Link
                key={order.id}
                href={`/pedido/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-5 transition-colors hover:bg-surface-container"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label-md text-label-md text-on-surface">
                      Pedido #{shortId}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {firstItem && (
                    <p className="truncate font-body-md text-body-md text-on-surface-variant">
                      {firstItem.product_name}
                      {extraCount > 0 && ` + ${extraCount} item${extraCount > 1 ? "s" : ""}`}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-caption text-caption text-on-surface-variant">
                    <span>{date}</span>
                    {order.payment_method && (
                      <span>{METHOD_LABEL[order.payment_method] ?? order.payment_method}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    {formatPrice(order.total_amount)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-on-surface-variant" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
