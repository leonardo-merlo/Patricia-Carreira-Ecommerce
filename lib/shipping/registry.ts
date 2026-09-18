import type { ShippingCarrier } from './carrier'
import { melhorEnvioCarrier } from './melhor-envio'
import type { CarrierId } from './types'

// Quais transportadoras estão em pé agora.
//
// A lista é decidida pela credencial, não por configuração no banco: um ambiente
// sem `CORREIOS_CODIGO_ACESSO` não tem como cotar pelos Correios, e ligar uma
// chave numa tela não mudaria isso. Assim o sandbox, a Vercel e a máquina do
// Leonardo se comportam cada um conforme o que de fato têm.
//
// A ordem importa: ela é a precedência quando duas transportadoras oferecem o
// mesmo serviço. Por ora há uma só — o adaptador dos Correios entra na frente
// quando a cotação direta ligar.
const TODAS: readonly ShippingCarrier[] = [melhorEnvioCarrier]

export function getShippingCarriers(): ShippingCarrier[] {
  return TODAS.filter((c) => c.isConfigured())
}

export function getCarrier(id: CarrierId): ShippingCarrier | null {
  return TODAS.find((c) => c.id === id) ?? null
}
