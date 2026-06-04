import { createServiceClient } from './service'
import type { AccountPayable } from '../types'

export async function getAllAccountsPayable(): Promise<AccountPayable[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('accounts_payable')
    .select('*')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('[getAllAccountsPayable]', error)
    return []
  }
  return (data ?? []) as AccountPayable[]
}

export async function getMonthlyRevenue(year: number, month: number): Promise<number> {
  const supabase = createServiceClient()

  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const to = new Date(year, month + 1, 1).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('payment_status', 'paid')
    .gte('updated_at', from)
    .lt('updated_at', to)

  if (error) {
    console.error('[getMonthlyRevenue]', error)
    return 0
  }

  return (data ?? []).reduce((sum, row) => sum + (row.total_amount ?? 0), 0)
}
