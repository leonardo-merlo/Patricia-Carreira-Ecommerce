import { requireAdmin } from '@/lib/server/auth'
import { getAllAnnouncements } from '@/lib/supabase/announcements'
import { ConfigPageShell } from '@/components/admin/config/config-page-shell'
import { SectionBanner } from '@/components/admin/config/section-banner'

export const dynamic = 'force-dynamic'

export default async function Page() {
  await requireAdmin()
  const messages = await getAllAnnouncements()

  return (
    <ConfigPageShell section="banner">
      <SectionBanner messages={messages} />
    </ConfigPageShell>
  )
}
