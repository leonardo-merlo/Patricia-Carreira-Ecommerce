import { calculateShipping, type MEShippingItem } from '@/lib/integrations/melhor-envio'
import { readEnv } from '@/lib/env'
import type { ShippingCarrier } from '../carrier'
import type { CarrierQuote, ShippingQuoteRequest } from '../types'

// O Melhor Envio visto pela camada neutra.
//
// Embrulho fino: `lib/integrations/melhor-envio.ts` continua onde está e
// continua sendo quem fala HTTP com o ME. Mover aquelas 290 linhas junto com a
// mudança de tipo do id misturaria duas coisas no mesmo diff, e este passo tem que
// ser um refactor que não muda um preço sequer. A mudança de casa é da fase que
// desliga o ME.

export const melhorEnvioCarrier: ShippingCarrier = {
  id: 'melhor-envio',
  label: 'Melhor Envio',

  isConfigured() {
    return Boolean(readEnv('MELHOR_ENVIO_TOKEN'))
  },

  async quote(request: ShippingQuoteRequest): Promise<CarrierQuote[]> {
    // A lista crua, não a caixa consolidada: o ME empacota por conta própria e
    // costuma sair mais barato do que a pilha. Mandar `request.parcel` aqui
    // mudaria o preço que o carrinho mostra hoje — e este passo é um refactor.
    const items: MEShippingItem[] = request.items.map((i) => ({
      weight: i.weightKg,
      width: i.widthCm,
      height: i.heightCm,
      length: i.lengthCm,
      quantity: i.quantity,
    }))

    const quotes = await calculateShipping(request.destinationZip, items, request.originZip)

    return quotes
      .filter((q) => !q.error && q.price != null)
      .map((q) => ({
        carrier: 'melhor-envio' as const,
        serviceCode: String(q.id),
        name: q.name ?? '',
        company: q.company?.name ?? '',
        // O ME devolve o preço como string, e às vezes com vírgula.
        price: Number(String(q.price!).replace(',', '.')),
        deliveryDaysMin: q.delivery_range?.min ?? 0,
        deliveryDaysMax: q.delivery_range?.max ?? 0,
      }))
  },
}
