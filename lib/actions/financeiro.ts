'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { getMonthlyRevenue } from '@/lib/supabase/financeiro'
import type {
  AccountPayable,
  ExpenseCategory,
  ExpensePaymentMethod,
  RecurrenceMonths,
} from '@/lib/types'

export async function fetchMonthlyRevenue(year: number, month: number): Promise<{ revenue: number }> {
  await requireAdmin()
  const revenue = await getMonthlyRevenue(year, month)
  return { revenue }
}

type AccountPayableInput = {
  description: string
  amount: number
  due_date: string
  category: ExpenseCategory
  creditor?: string | null
  store_id?: string | null
  payment_method?: ExpensePaymentMethod | null
  is_recurring: boolean
  recurrence_months?: RecurrenceMonths | null
  notes?: string | null
}

export async function createAccountPayable(
  input: AccountPayableInput
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase.from('accounts_payable').insert({
    description: input.description,
    amount: input.amount,
    due_date: input.due_date,
    category: input.category,
    creditor: input.creditor ?? null,
    store_id: input.store_id ?? null,
    payment_method: input.payment_method ?? null,
    is_recurring: input.is_recurring,
    recurrence_months: input.is_recurring ? (input.recurrence_months ?? 1) : null,
    notes: input.notes ?? null,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/financeiro')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateAccountPayable(
  id: string,
  input: Partial<AccountPayableInput>
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('accounts_payable')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/financeiro')
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteAccountPayable(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('accounts_payable')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/financeiro')
  revalidatePath('/admin')
  return { success: true }
}

// Soma meses a uma data YYYY-MM-DD preservando o dia quando possível.
// setMonth() estoura para o mês seguinte (31/jan + 1 mês → 03/mar); aqui o
// dia é limitado ao último dia do mês de destino (31/jan → 28/fev).
function addMonthsClamped(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const totalMonths = m - 1 + months
  const targetYear = y + Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12
  const daysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate()
  const day = Math.min(d, daysInTarget)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export async function markAccountAsPaid(
  accountId: string,
  paidAt: string,
  paymentMethod: ExpensePaymentMethod
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createServiceClient()

  // Busca a conta no banco — os dados usados para gerar a recorrência não
  // podem vir do cliente.
  const { data: accountRow, error: fetchError } = await supabase
    .from('accounts_payable')
    .select('*')
    .eq('id', accountId)
    .maybeSingle()

  if (fetchError || !accountRow) {
    return { success: false, error: 'Conta não encontrada' }
  }
  const account = accountRow as AccountPayable

  if (account.paid_at) {
    return { success: false, error: 'Conta já está marcada como paga' }
  }

  const { error } = await supabase
    .from('accounts_payable')
    .update({
      paid_at: paidAt,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)

  if (error) return { success: false, error: error.message }

  if (account.is_recurring && account.recurrence_months) {
    const nextDueStr = addMonthsClamped(account.due_date, account.recurrence_months)

    await supabase.from('accounts_payable').insert({
      description: account.description,
      amount: account.amount,
      due_date: nextDueStr,
      category: account.category,
      creditor: account.creditor,
      store_id: account.store_id,
      payment_method: null,
      is_recurring: true,
      recurrence_months: account.recurrence_months,
      notes: account.notes,
    })
  }

  revalidatePath('/admin/financeiro')
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Desfaz a baixa: a conta volta a Pendente.
 *
 * Não mexe na ocorrência seguinte que markAccountAsPaid pode ter criado, no caso
 * de conta recorrente — apagá-la aqui seria destruir um registro que o Henrique
 * talvez já tenha editado. Em vez disso, devolvemos `recurringWarning` para a
 * tela avisar que ela continua lá.
 */
export async function revertAccountToPending(
  accountId: string
): Promise<{ success: boolean; error?: string; recurringWarning?: boolean }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: accountRow, error: fetchError } = await supabase
    .from('accounts_payable')
    .select('id, paid_at, is_recurring')
    .eq('id', accountId)
    .maybeSingle()

  if (fetchError || !accountRow) {
    return { success: false, error: 'Conta não encontrada' }
  }
  if (!accountRow.paid_at) {
    return { success: false, error: 'Esta conta já está pendente' }
  }

  const { error } = await supabase
    .from('accounts_payable')
    .update({ paid_at: null, updated_at: new Date().toISOString() })
    .eq('id', accountId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/financeiro')
  revalidatePath('/admin')
  return { success: true, recurringWarning: Boolean(accountRow.is_recurring) }
}
