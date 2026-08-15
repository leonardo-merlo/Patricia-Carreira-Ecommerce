import { loadSettingsForAdmin } from '@/lib/server/config-settings'
import { ConfigPageShell, ConfigLoadError } from '@/components/admin/config/config-page-shell'
import { SectionPerfil } from '@/components/admin/config/section-perfil'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const settings = await loadSettingsForAdmin()
  return (
    <ConfigPageShell section="perfil">
      {settings ? <SectionPerfil settings={settings} /> : <ConfigLoadError />}
    </ConfigPageShell>
  )
}
