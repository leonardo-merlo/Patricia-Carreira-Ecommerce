import { getAllAccountsPayable, getMonthlyRevenue } from '@/lib/supabase/financeiro'
import { FinanceiroClient } from './financeiro-client'

export default async function FinanceiroPage() {
  const now = new Date()
  const [accounts, monthlyRevenue] = await Promise.all([
    getAllAccountsPayable(),
    getMonthlyRevenue(now.getFullYear(), now.getMonth()),
  ])
  return <FinanceiroClient initialAccounts={accounts} monthlyRevenue={monthlyRevenue} />
}
