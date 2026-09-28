import type { ShippingCarrier } from '../carrier'
import type { CarrierQuote, ShippingQuoteRequest } from '../types'
import { quoteCorreios } from './quote'
import { correiosCredenciaisPresentes } from './token'

// Os Correios pelo contrato do cliente, sem intermediário.
//
// Só cotação por enquanto. Pré-postagem e rastreio são as fases seguintes, e
// nenhuma chamada daqui escreve nos Correios: preço e prazo são somente leitura,
// e é por isso que este adaptador pode rodar em produção desde o primeiro dia.

export const correiosCarrier: ShippingCarrier = {
  id: 'correios',
  label: 'Correios',

  isConfigured() {
    return correiosCredenciaisPresentes()
  },

  quote(request: ShippingQuoteRequest): Promise<CarrierQuote[]> {
    return quoteCorreios(request)
  },
}

export { CORREIOS_COMPANY, CORREIOS_SERVICES } from './services'
