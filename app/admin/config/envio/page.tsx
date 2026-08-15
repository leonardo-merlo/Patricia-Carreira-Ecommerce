import { loadSettingsForAdmin } from '@/lib/server/config-settings'
import { ConfigPageShell, ConfigLoadError } from '@/components/admin/config/config-page-shell'
import { SectionEnvio } from '@/components/admin/config/section-envio'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const settings = await loadSettingsForAdmin()
  return (
    <ConfigPageShell section="envio">
      {settings ? <SectionEnvio settings={settings} /> : <ConfigLoadError />}
    </ConfigPageShell>
  )
}
