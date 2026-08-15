import { requireAdmin } from '@/lib/server/auth'
import { runDiagnostics } from '@/lib/server/diagnostics'
import { ConfigPageShell } from '@/components/admin/config/config-page-shell'
import { SectionIntegracoes } from '@/components/admin/config/section-integracoes'

export const dynamic = 'force-dynamic'

export default async function Page() {
  await requireAdmin()
  // Chama as APIs dos parceiros de verdade — é o que faz o badge dizer a verdade
  // em vez de "Conectado" fixo no código.
  const { services } = await runDiagnostics()

  return (
    <ConfigPageShell section="integracoes">
      <SectionIntegracoes services={services} />
    </ConfigPageShell>
  )
}
