import { loadSettingsForAdmin } from '@/lib/server/config-settings'
import { ConfigPageShell, ConfigLoadError } from '@/components/admin/config/config-page-shell'
import { SectionFiscal } from '@/components/admin/config/section-fiscal'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const settings = await loadSettingsForAdmin()
  return (
    <ConfigPageShell section="fiscal">
      {settings ? <SectionFiscal settings={settings} /> : <ConfigLoadError />}
    </ConfigPageShell>
  )
}
