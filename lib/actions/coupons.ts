'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { getCouponByCode } from '@/lib/supabase/coupons'
import { requireAdmin } from '@/lib/server/auth'
import type { Coupon } from '@/lib/types'
import { revalidatePath } from 'next/cache'

type CouponInput = {
  code: string
  type: 'percent' | 'fixed'
  value: number
  description: string | null
  min_order_value: number
  max_uses: number | null
  max_uses_per_user: number | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
}

export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<{ coupon: Coupon | null; error: string | null }> {
  if (!code.trim()) return { coupon: null, error: 'Informe um código de cupom.' }

  const coupon = await getCouponByCode(code.trim())

  if (!coupon) return { coupon: null, error: 'Cupom inválido ou expirado.' }

  if (subtotal < coupon.min_order_value) {
    return {
      coupon: null,
      error: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2).replace('.', ',')} para este cupom.`,
    }
  }

  if (coupon.max_uses_per_user !== null) {
    try {
      const supabaseAuth = createClient()
      const { data: { user } } = await supabaseAuth.auth.getUser()

      if (user) {
        const supabase = createServiceClient()
        const { count } = await supabase
          .from('coupon_usages')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', user.id)

        if ((count ?? 0) >= coupon.max_uses_per_user) {
          return { coupon: null, error: 'Você já utilizou este cupom.' }
        }
      }
    } catch {
      // Se não conseguir verificar a sessão, permite prosseguir — a verificação definitiva ocorre no pedido
    }
  }

  return { coupon, error: null }
}

export async function createCoupon(input: CouponInput): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase.from('coupons').insert({
    ...input,
    code: input.code.toUpperCase().trim(),
    uses_count: 0,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Já existe um cupom com este código.' }
    console.error('[createCoupon]', error)
    return { error: 'Erro ao criar cupom.' }
  }

  revalidatePath('/admin/cupons')
  return { error: null }
}

export async function updateCoupon(
  id: string,
  input: CouponInput,
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('coupons')
    .update({ ...input, code: input.code.toUpperCase().trim() })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'Já existe um cupom com este código.' }
    console.error('[updateCoupon]', error)
    return { error: 'Erro ao atualizar cupom.' }
  }

  revalidatePath('/admin/cupons')
  return { error: null }
}

export async function toggleCouponActive(
  id: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    console.error('[toggleCouponActive]', error)
    return { error: 'Erro ao atualizar cupom.' }
  }

  revalidatePath('/admin/cupons')
  return { error: null }
}

export async function deleteCoupon(id: string): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase.from('coupons').delete().eq('id', id)

  if (error) {
    console.error('[deleteCoupon]', error)
    return { error: 'Erro ao excluir cupom.' }
  }

  revalidatePath('/admin/cupons')
  return { error: null }
}
