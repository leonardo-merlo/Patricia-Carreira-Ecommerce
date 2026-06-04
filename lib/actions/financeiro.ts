'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  AccountPayable,
  ExpenseCategory,
  PaymentMethod,
  RecurrenceMonths,
} from '@/lib/types'

type AccountPayableInput = {
  description: string
  amount: number
  due_date: string
  category: ExpenseCategory
  creditor?: string | null
  payment_method?: PaymentMethod | null
  is_recurring: boolean
  recurrence_months?: RecurrenceMonths | null
  notes?: string | null
}

export async function createAccountPayable(
  input: AccountPayableInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('accounts_payable').insert({
    description: input.description,
    amount: input.amount,
    due_date: input.due_date,
    category: input.category,
    creditor: input.creditor ?? null,
    payment_method: input.payment_method ?? null,
    is_recurring: input.is_recurring,
    recurrence_months: input.is_recurring ? (input.recurrence_months ?? 1) : null,
    notes: input.notes ?? null,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function updateAccountPayable(
  id: string,
  input: Partial<AccountPayableInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('accounts_payable')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function deleteAccountPayable(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('accounts_payable')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/financeiro')
  return { success: true }
}

export async function markAccountAsPaid(
  account: AccountPayable,
  paidAt: string,
  paymentMethod: PaymentMethod
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('accounts_payable')
    .update({
      paid_at: paidAt,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id)

  if (error) return { success: false, error: error.message }

  if (account.is_recurring && account.recurrence_months) {
    const nextDue = new Date(account.due_date + 'T00:00:00')
    nextDue.setMonth(nextDue.getMonth() + account.recurrence_months)
    const nextDueStr = nextDue.toISOString().split('T')[0]

    await supabase.from('accounts_payable').insert({
      description: account.description,
      amount: account.amount,
      due_date: nextDueStr,
      category: account.category,
      creditor: account.creditor,
      payment_method: null,
      is_recurring: true,
      recurrence_months: account.recurrence_months,
      notes: account.notes,
    })
  }

  revalidatePath('/admin/financeiro')
  return { success: true }
}
