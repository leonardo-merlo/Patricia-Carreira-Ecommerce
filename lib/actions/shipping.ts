'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getShippingOrigin } from '@/lib/server/store-identity'
import { getStoreSettings } from '@/lib/server/store-settings'
import { formatOptionId } from '@/lib/shipping/option-id'
import { consolidatePackage } from '@/lib/shipping/package'
import { getShippingCarriers } from '@/lib/shipping/registry'
import type { CarrierQuote, ShippingPackageItem } from '@/lib/shipping/types'
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
 *
 * Vale para qualquer transportadora: o adaptador dos Correios emite o mesmo
 * vocabulário ("Correios", "PAC"), então o que já está salvo continua valendo
 * sem migration de dado.
 */
function matchesEnabledCarrier(quote: CarrierQuote, enabledCarriers: string[]): boolean {
  if (enabledCarriers.length === 0) return true

  const empresa = quote.company.trim().toLowerCase()
  const servico = quote.name.trim().toLowerCase()

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
    // Mesma resolução que a compra da etiqueta usa. Cotar por um CEP e coletar
    // em outro era possível enquanto cada caminho lia a sua própria fonte.
    const originCep = (await getShippingOrigin()).endereco.zip
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

    const items: ShippingPackageItem[] = []
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
        weightKg: product.weight_grams / 1000,
        widthCm: product.width_cm ?? 10,
        heightCm: product.height_cm ?? 5,
        lengthCm: product.length_cm ?? 20,
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

    const carriers = getShippingCarriers()
    if (carriers.length === 0) {
      return { ok: false, error: 'Nenhuma transportadora configurada' }
    }

    const request = {
      originZip: originCep,
      destinationZip: destCep.replace(/\D/g, ''),
      items,
      parcel: consolidatePackage(items),
      declaredValue: 0,
    }

    // allSettled e não all: uma transportadora fora do ar não pode levar as
    // outras junto. Parar de vender é pior que vender com menos opções — a
    // mesma regra que a origem do frete já segue.
    const respostas = await Promise.allSettled(carriers.map((c) => c.quote(request)))

    const cotacoes: CarrierQuote[] = []
    for (let i = 0; i < respostas.length; i++) {
      const r = respostas[i]
      if (r.status === 'fulfilled') {
        cotacoes.push(...r.value)
      } else {
        console.error(`[getShippingOptions] ${carriers[i].label} não cotou:`, r.reason)
      }
    }

    const options: ShippingOption[] = cotacoes
      .filter((q) => q.price > 0)
      .filter((q) => matchesEnabledCarrier(q, enabledCarriers))
      .map((q) => ({
        id: formatOptionId(q.carrier, q.serviceCode),
        name: q.name,
        company: q.company,
        price: q.price,
        delivery_days_min: q.deliveryDaysMin + extraDays,
        delivery_days_max: q.deliveryDaysMax + extraDays,
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
