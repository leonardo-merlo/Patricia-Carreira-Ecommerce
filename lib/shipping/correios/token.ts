import { readEnv } from '@/lib/env'

// Cache do token dos Correios.
//
// Não é otimização: a API de token tem limite de 3 requisições por segundo e
// responde 429 acima disso. Sem cache, um pico de carrinhos derruba a
// autenticação — e o que cai junto é a cotação de todo mundo, não só a de quem
// causou o pico. A própria documentação manda reaproveitar o token.
//
// O cache é por ESCOPO porque existem três, e eles não são intercambiáveis:
// `/v1/autentica` (usuário), `/v1/autentica/contrato` e
// `/v1/autentica/cartaopostagem`. Cotação usa o de contrato; o SRO Interatividade
// vai exigir o de cartão de postagem. Um Map em vez de uma variável é o que
// permite os dois conviverem sem um derrubar o outro.

export type EscopoToken = 'contrato' | 'cartao-postagem'

type Entrada = {
  token: string
  /** epoch ms */
  expiraEm: number
  /** número da DR do contrato — vem no próprio token, não de variável nova */
  dr: number | null
}

const cache = new Map<EscopoToken, Entrada>()

// Uma requisição em voo por escopo. Dez carrinhos simultâneos com o cache frio
// fazem UMA chamada, não dez — é o que atende o limite de 3 req/s sem precisar
// de um rate limiter de verdade.
const emVoo = new Map<EscopoToken, Promise<Entrada>>()

/**
 * Margem antes do vencimento. O token vale 24 h; renovar cinco minutos antes
 * evita o caso em que ele expira entre a checagem e a chamada que o usa.
 */
const MARGEM_MS = 5 * 60 * 1000

export class CorreiosAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CorreiosAuthError'
  }
}

export function correiosBaseUrl(): string {
  // readEnv e não process.env cru: comentário inline colado no valor viraria
  // parte da URL e toda chamada sairia para um host inexistente.
  return readEnv('CORREIOS_BASE_URL') || 'https://api.correios.com.br'
}

export function correiosCredenciaisPresentes(): boolean {
  return Boolean(
    readEnv('CORREIOS_USUARIO') && readEnv('CORREIOS_CODIGO_ACESSO') && readEnv('CORREIOS_CONTRATO')
  )
}

export function correiosContrato(): string {
  return readEnv('CORREIOS_CONTRATO')
}

/**
 * O header `Authorization: Basic`.
 *
 * O código de acesso é lido aqui e não sai daqui: ele não entra em mensagem de
 * erro, em log nem no retorno de nenhuma função deste módulo.
 */
function basicAuth(): string {
  const usuario = readEnv('CORREIOS_USUARIO')
  const codigo = readEnv('CORREIOS_CODIGO_ACESSO')
  return `Basic ${Buffer.from(`${usuario}:${codigo}`).toString('base64')}`
}

const ROTAS: Record<EscopoToken, string> = {
  contrato: '/token/v1/autentica/contrato',
  'cartao-postagem': '/token/v1/autentica/cartaopostagem',
}

type RespostaToken = {
  token?: string
  expiraEm?: string
  contrato?: { numero?: string; dr?: number }
  msgs?: string[]
}

async function autenticar(escopo: EscopoToken): Promise<Entrada> {
  if (!correiosCredenciaisPresentes()) {
    throw new CorreiosAuthError(
      'Correios: credenciais ausentes — faltam CORREIOS_USUARIO, CORREIOS_CODIGO_ACESSO ou CORREIOS_CONTRATO.'
    )
  }

  const contrato = correiosContrato()
  const body =
    escopo === 'contrato'
      ? { numero: contrato }
      : { numero: readEnv('CORREIOS_CARTAO_POSTAGEM'), contrato }

  const res = await fetch(`${correiosBaseUrl()}${ROTAS[escopo]}`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const texto = await res.text()
  let dados: RespostaToken
  try {
    dados = JSON.parse(texto) as RespostaToken
  } catch {
    throw new CorreiosAuthError(
      `Correios: resposta inesperada na autenticação (${res.status}): ${texto.trim().slice(0, 120)}`
    )
  }

  // A autenticação de contrato responde 201, não 200.
  if (!res.ok || !dados.token) {
    const motivo = dados.msgs?.join('; ') || `HTTP ${res.status}`
    throw new CorreiosAuthError(`Correios: autenticação recusada (${motivo}).`)
  }

  // `expiraEm` vem sem fuso ("2026-09-19T16:08:46"). Na dúvida sobre o fuso, a
  // janela de 24 h é grande o bastante para a margem de 5 min absorver o erro;
  // uma data ilegível vira uma hora, que é conservador e nunca estoura o limite.
  const expiraEm = Date.parse(dados.expiraEm ?? '')
  const entrada: Entrada = {
    token: dados.token,
    expiraEm: Number.isFinite(expiraEm) ? expiraEm : Date.now() + 60 * 60 * 1000,
    dr: dados.contrato?.dr ?? null,
  }

  cache.set(escopo, entrada)
  return entrada
}

async function obterEntrada(escopo: EscopoToken): Promise<Entrada> {
  const atual = cache.get(escopo)
  if (atual && atual.expiraEm - MARGEM_MS > Date.now()) return atual

  const jaPedido = emVoo.get(escopo)
  if (jaPedido) return jaPedido

  const promessa = autenticar(escopo).finally(() => emVoo.delete(escopo))
  emVoo.set(escopo, promessa)
  return promessa
}

export async function getCorreiosToken(escopo: EscopoToken = 'contrato'): Promise<string> {
  return (await obterEntrada(escopo)).token
}

/**
 * Número da DR do contrato.
 *
 * Sai do próprio token — a resposta da autenticação traz `contrato.dr`. Não é
 * variável de ambiente de propósito: é um dado que a API já entrega e que
 * ficaria desatualizado na Vercel no dia em que o contrato mudasse de DR.
 */
export async function getCorreiosDr(): Promise<number | null> {
  return (await obterEntrada('contrato')).dr
}

/** Só para teste: esquece o que está em cache. */
export function limparCacheDeToken(): void {
  cache.clear()
  emVoo.clear()
}
