import { getCustomers } from '@/lib/supabase/customer-queries'
import { ClientesClient } from '@/components/admin/clientes-client'

export const dynamic = 'force-dynamic'

// O ?cliente=<id> vem do link no nome do cliente lá em Pedidos. Ler aqui, no
// servidor, evita o useSearchParams no cliente — que exigiria Suspense e
// derrubaria o prerender da rota.
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { cliente?: string }
}) {
  const customers = await getCustomers()
  return <ClientesClient initialData={customers} initialSelectedId={searchParams.cliente ?? null} />
}
