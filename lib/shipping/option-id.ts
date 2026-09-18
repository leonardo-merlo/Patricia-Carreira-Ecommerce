import type { CarrierId } from './types'

// O id da opção de frete atravessa o navegador e volta.
//
// Ele sai do servidor na cotação, o cliente escolhe, e o payload do checkout traz
// de volta só o id — que `payments.ts` revalida contra uma cotação nova antes de
// cobrar. Enquanto só existia o Melhor Envio, `1` bastava. Com duas
// transportadoras, o serviço `1` do ME e o serviço `1` dos Correios são coisas
// diferentes com o mesmo número, e a revalidação casaria com a errada sem ruído.
//
// Um campo composto, e não duas colunas, porque o contrato de quem consome não
// muda: `quote.options.find(o => o.id === escolhido)` continua igual, só o tipo
// deixa de ser número.

const SEPARADOR = ':'

export function formatOptionId(carrier: CarrierId, serviceCode: string): string {
  return `${carrier}${SEPARADOR}${serviceCode}`
}

export type ParsedOptionId = {
  carrier: CarrierId
  serviceCode: string
}

const CARRIERS: readonly CarrierId[] = ['correios', 'melhor-envio']

/**
 * Devolve `null` para qualquer coisa que não seja um id que nós emitimos.
 *
 * O valor vem do navegador: transportadora desconhecida ou texto solto não pode
 * virar uma consulta com um código inventado dentro.
 */
export function parseOptionId(value: string): ParsedOptionId | null {
  const corte = value.indexOf(SEPARADOR)
  if (corte <= 0) return null

  const carrier = value.slice(0, corte)
  // Do primeiro `:` em diante é tudo código de serviço — quebrar por todos os
  // separadores truncaria um código que um dia contenha `:`.
  const serviceCode = value.slice(corte + 1)

  if (!serviceCode) return null
  if (!CARRIERS.includes(carrier as CarrierId)) return null

  return { carrier: carrier as CarrierId, serviceCode }
}
