import { getReportData } from '@/lib/supabase/report-queries'
import { VendasClient } from '@/components/admin/vendas-client'

function defaultPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  searchParams: { period?: string }
}

export default async function VendasPage({ searchParams }: Props) {
  const period = searchParams.period ?? defaultPeriod()
  const data = await getReportData(period)
  return <VendasClient data={data} period={period} />
}
