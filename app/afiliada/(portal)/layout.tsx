import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // getUser valida o token junto ao Supabase — getSession só lê o cookie
  const userClient = createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user?.email) redirect('/afiliada/entrar')

  // Check partner record with service client (bypasses admin-only RLS)
  const serviceClient = createServiceClient()
  const { data: partner } = await serviceClient
    .from('partners')
    .select('id, is_active')
    .eq('email', user.email)
    .eq('type', 'affiliate')
    .single()

  if (!partner || !partner.is_active) redirect('/afiliada/entrar?erro=nao-autorizada')

  return <div className="afiliada-portal">{children}</div>
}
