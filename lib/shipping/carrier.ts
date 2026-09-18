import type { CarrierId, CarrierQuote, ShippingQuoteRequest } from './types'

/**
 * O que uma transportadora precisa saber fazer para a loja cotar por ela.
 *
 * Só `quote` por enquanto, de propósito. Comprar etiqueta e consultar rastreio
 * ainda são caminhos exclusivamente do Melhor Envio (`lib/server/label.ts`), e
 * declarar aqui métodos que só uma das duas implementa transformaria a interface
 * numa lista de coisas que lançam "não implementado" — que é pior que não ter
 * interface. Eles entram quando a pré-postagem dos Correios existir.
 */
export interface ShippingCarrier {
  readonly id: CarrierId
  /** nome em português, para mensagem de erro e diagnóstico */
  readonly label: string
  /** Credenciais presentes. Falso tira a transportadora do registry. */
  isConfigured(): boolean
  quote(request: ShippingQuoteRequest): Promise<CarrierQuote[]>
}
