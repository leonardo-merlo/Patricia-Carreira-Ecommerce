import type { ShippingPackage, ShippingPackageItem } from './types'

// De N itens no carrinho para UMA caixa.
//
// O Melhor Envio aceitava a lista de produtos e resolvia o empacotamento por
// conta própria; os Correios precificam um objeto, com um peso e um conjunto de
// dimensões. Somar N cotações produziria um preço que a etiqueta não consegue
// honrar: a pré-postagem cria UMA pré-postagem, com UM `pesoInformado`. Cotar
// quatro objetos e despachar um é a mesma família de erro que cotar por um CEP e
// coletar em outro — o cliente paga um frete, a loja paga outro, e nada acusa.
//
// O modelo é o da pilha: as peças vão empilhadas dentro da mesma caixa. Peso soma,
// a base é a maior base entre os itens, e a altura é a soma das alturas.

/**
 * Não é preciso elevar as medidas a nenhum mínimo antes de enviar. Medido contra
 * a API de produção em 18/09/2026: um pacote de 10×8×1 cm sai pelo mesmo preço de
 * um de 16×11×2 — os Correios aplicam a faixa mínima do lado deles. Um clamp aqui
 * seria código que não faz nada hoje e que amanhã divergiria do que a
 * pré-postagem manda.
 *
 * O teto existe e é deles: acima de 100 cm em qualquer lado a resposta é
 * `ERP-008`, o serviço cai fora da lista e o carrinho segue com quem atende.
 */
export function consolidatePackage(items: ShippingPackageItem[]): ShippingPackage {
  const parcel: ShippingPackage = { weightKg: 0, widthCm: 0, heightCm: 0, lengthCm: 0 }

  for (const item of items) {
    const quantity = Math.max(1, Math.trunc(item.quantity))

    parcel.weightKg += item.weightKg * quantity
    parcel.heightCm += item.heightCm * quantity
    parcel.lengthCm = Math.max(parcel.lengthCm, item.lengthCm)
    parcel.widthCm = Math.max(parcel.widthCm, item.widthCm)
  }

  return parcel
}
