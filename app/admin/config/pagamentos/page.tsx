import { loadSettingsForAdmin } from '@/lib/server/config-settings'
import { ConfigPageShell, ConfigLoadError } from '@/components/admin/config/config-page-shell'
import { SectionPagamentos } from '@/components/admin/config/section-pagamentos'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const settings = await loadSettingsForAdmin()
  return (
    <ConfigPageShell section="pagamentos">
      {settings ? <SectionPagamentos settings={settings} /> : <ConfigLoadError />}
    </ConfigPageShell>
  )
}
