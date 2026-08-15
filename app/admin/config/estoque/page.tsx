import { loadSettingsForAdmin } from '@/lib/server/config-settings'
import { ConfigPageShell, ConfigLoadError } from '@/components/admin/config/config-page-shell'
import { SectionEstoque } from '@/components/admin/config/section-estoque'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const settings = await loadSettingsForAdmin()
  return (
    <ConfigPageShell section="estoque">
      {settings ? <SectionEstoque settings={settings} /> : <ConfigLoadError />}
    </ConfigPageShell>
  )
}
