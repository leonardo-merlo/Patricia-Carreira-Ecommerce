'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { calculateShipping, type MEShippingItem, type MEQuoteResult } from '@/lib/integrations/melhor-envio'
import { getStoreSettings } from '@/lib/server/store-settings'
import type { ShippingOption } from '@/lib/types'

export type ShippingResult =
  | { ok: true; options: ShippingOption[]; freeShippingThreshold: number }
  | { ok: false; error: string }

// Valor usado quando store_settings ainda não foi configurado
const FREE_SHIPPING_THRESHOLD_FALLBACK = 599

// Leitura pública — usada pelo carrinho para exibir a barra de frete grátis
// com o valor configurado no admin em vez de um número fixo no código.
export async function getFreeShippingThreshold(): Promise<number> {
  const settings = await getStoreSettings().catch(() => null)
  return settings?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD_FALLBACK
}

/**
 * O rótulo salvo em `enabled_carriers` tem a forma "Empresa (Serviço)" —
 * "Correios (PAC)", "Jadlog (.Package)". Comparar as duas partes separadamente
 * é o que faz o filtro valer: antes a regra de Correios procurava "correo"
 * (grafia espanhola) e o ME devolve "Correios", então PAC e SEDEX eram
 * descartados em silêncio; e a de Jadlog casava só pela empresa, então ".Com"
 * passava sem estar habilitado.
 */
function matchesEnabledCarrier(quote: MEQuoteResult, enabledCarriers: string[]): boolean {
  if (enabledCarriers.length === 0) return true

  const empresa = (quote.company?.name ?? '').trim().toLowerCase()
  const servico = (quote.name ?? '').trim().toLowerCase()

  return enabledCarriers.some((rotulo) => {
    const match = rotulo.trim().toLowerCase().match(/^([^(]+?)\s*(?:\(([^)]*)\))?$/)
    if (!match) return false

    const empresaEsperada = match[1].trim()
    const servicoEsperado = (match[2] ?? '').trim()

    if (empresa !== empresaEsperada) return false
    // Rótulo sem parênteses ("Jadlog") libera todos os serviços da empresa.
    return servicoEsperado === '' || servico === servicoEsperado
  })
}

export async function getShippingOptions(
  destCep: string,
  cartItems: Array<{ variantId: string; quantity: number }>
): Promise<ShippingResult> {
  try {
    const settings = await getStoreSettings()
    const originCep = settings?.origin_cep?.replace(/\D/g, '') || process.env.STORE_CEP_ORIGEM?.replace(/\D/g, '')
    const freeShippingThreshold = settings?.free_shipping_threshold ?? 599
    const extraDays = settings?.shipping_extra_days ?? 0
    const enabledCarriers = settings?.enabled_carriers ?? []

    if (!originCep) {
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

    const quotes = await calculateShipping(destCep, items, originCep)

    const options: ShippingOption[] = quotes
      .filter((q) => !q.error && q.price != null)
      .filter((q) => matchesEnabledCarrier(q, enabledCarriers))
      .map((q) => ({
        id: q.id,
        name: q.name,
        company: q.company.name,
        price: Number(String(q.price!).replace(',', '.')),
        delivery_days_min: q.delivery_range.min + extraDays,
        delivery_days_max: q.delivery_range.max + extraDays,
      }))
      .sort((a, b) => a.price - b.price)

    if (options.length === 0) {
      return {
        ok: false,
        error: 'Nenhuma transportadora disponível para o CEP informado',
      }
    }

    return { ok: true, options, freeShippingThreshold }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao calcular frete'
    return { ok: false, error: msg }
  }
}
