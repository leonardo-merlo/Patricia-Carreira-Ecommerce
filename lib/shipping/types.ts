// O vocabulário de frete, sem transportadora dentro.
//
// Antes disso a loja falava Melhor Envio em todo lugar: `ShippingOption.id` era o
// service id do ME, o rótulo salvo em `enabled_carriers` era o nome que o ME dá à
// empresa, e a coluna do pedido se chamava `melhor_envio_service_id`. Trocar de
// transportadora exigiria mexer nas vinte e quatro peças que citam o ME.
//
// Aqui só existem as palavras que qualquer transportadora entende. Quem sabe o que
// é `03298` é o adaptador dos Correios, e mais ninguém.

/** Hífen, não underscore: é o mesmo texto que vai no id composto da opção. */
export type CarrierId = 'correios' | 'melhor-envio'

/** Um item do carrinho, com as medidas já resolvidas do produto. */
export type ShippingPackageItem = {
  /** quilos */
  weightKg: number
  widthCm: number
  heightCm: number
  lengthCm: number
  quantity: number
}

/** A caixa que vai ser postada, depois de consolidar os itens. */
export type ShippingPackage = {
  weightKg: number
  widthCm: number
  heightCm: number
  lengthCm: number
}

/**
 * O pedido de cotação carrega o carrinho de **duas** formas, e as duas são usadas.
 *
 * `items` é o carrinho como ele é. O Melhor Envio recebe a lista e resolve o
 * empacotamento do lado dele — é assim desde sempre, e mudar isso mudaria o preço
 * que o cliente vê hoje.
 *
 * `parcel` é a mesma coisa consolidada numa caixa só. Os Correios precificam um
 * objeto, e a pré-postagem vai criar uma pré-postagem com um peso — cotar quatro
 * objetos e despachar um faria o cliente pagar um frete e a loja pagar outro.
 *
 * Duas formas do mesmo carrinho, não duas verdades: quem monta as duas é
 * `consolidatePackage()`, a partir da mesma lista.
 */
export type ShippingQuoteRequest = {
  /** só dígitos */
  originZip: string
  /** só dígitos */
  destinationZip: string
  items: ShippingPackageItem[]
  parcel: ShippingPackage
  /** valor declarado; 0 quando não há seguro contratado */
  declaredValue: number
}

/**
 * Uma opção de frete devolvida por uma transportadora.
 *
 * `company` e `name` mantêm o vocabulário que já está salvo em
 * `store_settings.enabled_carriers` ("Correios (PAC)"), para que o filtro do
 * carrinho continue valendo sem migration de dado.
 */
export type CarrierQuote = {
  carrier: CarrierId
  /** código do serviço na transportadora: '03298' nos Correios, '1' no ME */
  serviceCode: string
  /** 'PAC' | 'SEDEX' | 'Mini Envios' | '.Package' */
  name: string
  /** 'Correios' | 'Jadlog' */
  company: string
  price: number
  deliveryDaysMin: number
  deliveryDaysMax: number
}
