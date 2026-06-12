import { getAllAccountsPayable, getMonthlyRevenue } from '@/lib/supabase/financeiro'
import { getStores } from '@/lib/actions/stores'
import { FinanceiroClient } from './financeiro-client'

export default async function FinanceiroPage() {
  const now = new Date()
  const [accounts, monthlyRevenue, stores] = await Promise.all([
    getAllAccountsPayable(),
    getMonthlyRevenue(now.getFullYear(), now.getMonth()),
    getStores(),
  ])
  return <FinanceiroClient initialAccounts={accounts} monthlyRevenue={monthlyRevenue} initialStores={stores} />
}
