import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/afiliada/entrar')

  const { data: partner } = await supabase
    .from('partners')
    .select('id, is_active')
    .eq('email', session.user.email!)
    .eq('type', 'affiliate')
    .single()

  if (!partner || !partner.is_active) redirect('/afiliada/entrar?erro=nao-autorizada')

  return <div className="afiliada-portal">{children}</div>
}
