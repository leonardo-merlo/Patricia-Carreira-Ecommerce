import { loadSettingsForAdmin } from '@/lib/server/config-settings'
import { ConfigPageShell, ConfigLoadError } from '@/components/admin/config/config-page-shell'
import { SectionNotificacoes } from '@/components/admin/config/section-notificacoes'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const settings = await loadSettingsForAdmin()
  return (
    <ConfigPageShell section="notificacoes">
      {settings ? <SectionNotificacoes settings={settings} /> : <ConfigLoadError />}
    </ConfigPageShell>
  )
}
