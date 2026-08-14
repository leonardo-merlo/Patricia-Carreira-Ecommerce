import { notFound } from "next/navigation"
import { getPublicOrder } from "@/lib/actions/orders"
import { PedidoClient } from "./pedido-client"

// Consulta pública: sempre buscar do banco, nunca de cache — o status muda quando
// o webhook confirma o pagamento e quando o pedido é despachado.
export const dynamic = "force-dynamic"

export default async function PedidoPage({
  params,
}: {
  params: { id: string }
}) {
  const order = await getPublicOrder(params.id)
  if (!order) notFound()

  return <PedidoClient order={order} />
}
