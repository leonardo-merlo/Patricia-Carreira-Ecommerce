import { getReportData } from '@/lib/supabase/report-queries'
import { RelatoriosClient } from '@/components/admin/relatorios-client'

function defaultPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  searchParams: { period?: string }
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const period = searchParams.period ?? defaultPeriod()
  const data = await getReportData(period)
  return <RelatoriosClient data={data} period={period} />
}
