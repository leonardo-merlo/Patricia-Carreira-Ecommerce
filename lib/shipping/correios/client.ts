import { correiosBaseUrl, getCorreiosToken, type EscopoToken } from './token'

// O fetch autenticado dos Correios, com a tradução de erro num lugar só.

export class CorreiosApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CorreiosApiError'
    this.status = status
  }
}

type MensagemDeErro = {
  msgs?: string[]
  causa?: string
}

/**
 * POST autenticado que devolve JSON.
 *
 * **HTTP 206 é sucesso.** A cotação em lote responde 206 (Partial Content)
 * quando parte dos serviços falhou e parte funcionou — `res.ok` é `true` nesse
 * caso, e quem olhar só o status não vê a recusa. O erro de verdade é por item,
 * no campo `txErro` de cada elemento da resposta, e quem trata isso é `quote.ts`.
 * Aqui só passa ou não passa a requisição inteira.
 */
export async function correiosPost<T>(
  caminho: string,
  body: unknown,
  opts?: { escopo?: EscopoToken; contexto?: string }
): Promise<T> {
  const contexto = opts?.contexto ?? caminho
  const token = await getCorreiosToken(opts?.escopo ?? 'contrato')

  const res = await fetch(`${correiosBaseUrl()}${caminho}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const texto = await res.text()

  let dados: unknown
  try {
    dados = JSON.parse(texto)
  } catch {
    throw new CorreiosApiError(
      `Correios: resposta inesperada em ${contexto} (${res.status}, ${res.headers.get('content-type') ?? 'sem content-type'}): ${texto.trim().slice(0, 120)}`,
      res.status
    )
  }

  if (!res.ok) {
    const erro = dados as MensagemDeErro
    const motivo = erro?.msgs?.join('; ') || erro?.causa || `HTTP ${res.status}`
    throw new CorreiosApiError(`Correios: ${contexto} recusada — ${motivo}`, res.status)
  }

  return dados as T
}
