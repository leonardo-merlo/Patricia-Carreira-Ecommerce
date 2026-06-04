import { getCustomers } from '@/lib/supabase/customer-queries'
import { ClientesClient } from '@/components/admin/clientes-client'

export default async function ClientesPage() {
  const customers = await getCustomers()
  return <ClientesClient initialData={customers} />
}
