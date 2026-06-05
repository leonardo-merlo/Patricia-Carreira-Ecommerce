'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { calculateShipping, type MEShippingItem } from '@/lib/integrations/melhor-envio'
import type { ShippingOption } from '@/lib/types'

export async function getShippingOptions(
  destCep: string,
  cartItems: Array<{ variantId: string; quantity: number }>
): Promise<{ ok: true; options: ShippingOption[] } | { ok: false; error: string }> {
  try {
    if (!process.env.STORE_CEP_ORIGEM) {
      return { ok: false, error: 'CEP de origem da loja não configurado' }
    }

    const supabase = createServiceClient()

    const { data: variants, error } = await supabase
      .from('product_variants')
      .select('id, product:products(weight_grams, length_cm, width_cm, height_cm)')
      .in('id', cartItems.map((i) => i.variantId))

    if (error) throw new Error('Erro ao buscar dados dos produtos')

    const items: MEShippingItem[] = []
    const missingDimensions: string[] = []

    for (const cartItem of cartItems) {
      const variant = variants?.find((v) => v.id === cartItem.variantId)
      const productRaw = variant?.product
      const product = (Array.isArray(productRaw) ? productRaw[0] : productRaw) as {
        weight_grams: number | null
        length_cm: number | null
        width_cm: number | null
        height_cm: number | null
      } | null | undefined

      if (!product?.weight_grams) {
        missingDimensions.push(cartItem.variantId)
        continue
      }

      items.push({
        weight: product.weight_grams / 1000,
        width: product.width_cm ?? 10,
        height: product.height_cm ?? 5,
        length: product.length_cm ?? 20,
        quantity: cartItem.quantity,
      })
    }

    if (missingDimensions.length > 0) {
      return {
        ok: false,
        error:
          'Alguns produtos não possuem peso e dimensões cadastradas. Entre em contato para calcular o frete.',
      }
    }

    if (items.length === 0) {
      return { ok: false, error: 'Nenhum item no carrinho' }
    }

    const quotes = await calculateShipping(destCep, items)

    const options: ShippingOption[] = quotes
      .filter((q) => !q.error && q.price != null)
      .map((q) => ({
        id: q.id,
        name: q.name,
        company: q.company.name,
        price: Number(String(q.price!).replace(',', '.')),
        delivery_days_min: q.delivery_range.min,
        delivery_days_max: q.delivery_range.max,
      }))
      .sort((a, b) => a.price - b.price)

    if (options.length === 0) {
      return {
        ok: false,
        error: 'Nenhuma transportadora disponível para o CEP informado',
      }
    }

    return { ok: true, options }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao calcular frete'
    return { ok: false, error: msg }
  }
}
