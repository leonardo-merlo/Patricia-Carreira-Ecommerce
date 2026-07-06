import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Garante que a chamada vem de um usuário autenticado com role 'admin'.
// Usar em toda Server Action administrativa — actions são endpoints HTTP
// públicos e o middleware não protege chamadas diretas ao endpoint da action.
export async function requireAdmin(): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autorizado')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') throw new Error('Não autorizado')
}
