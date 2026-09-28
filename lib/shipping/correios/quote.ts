import type { CarrierQuote, ShippingQuoteRequest } from '../types'
import { correiosPost } from './client'
import { CORREIOS_COMPANY, CORREIOS_SERVICES } from './services'
import { correiosContrato, getCorreiosDr } from './token'

// Cotação nos Correios: preço e prazo.
//
// São duas APIs separadas, cada uma aceitando lote de até 100. Os três serviços
// saem numa chamada de cada, em paralelo — seis consultas viram duas. As duas são
// SOMENTE LEITURA: rodam contra produção sem criar nem gastar nada.

type PrecoParam = {
  coProduto: string
  nuRequisicao: string
  nuContrato?: string
  nuDR?: number
  cepOrigem: string
  cepDestino: string
  psObjeto: string
  tpObjeto: string
  comprimento: string
  largura: string
  altura: string
  vlDeclarado: string
}

type PrecoResposta = {
  coProduto?: string
  nuRequisicao?: string
  /** preço final em pt-BR: "25,94" */
  pcFinal?: string
  txErro?: string
}

type PrazoResposta = {
  coProduto?: string
  nuRequisicao?: string
  /** dias úteis — um inteiro, não uma faixa */
  prazoEntrega?: number
  txErro?: string
}

/** 2 = Pacote. A loja despacha caixa, nunca envelope nem rolo. */
const TIPO_PACOTE = '2'

/** "25,94" → 25.94. A API devolve o preço no formato brasileiro. */
function precoBrParaNumero(valor: string): number {
  const n = Number(valor.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Os Correios querem centímetros e gramas inteiros. */
function inteiro(valor: number, minimo = 1): string {
  return String(Math.max(minimo, Math.round(valor)))
}

export async function quoteCorreios(request: ShippingQuoteRequest): Promise<CarrierQuote[]> {
  const contrato = correiosContrato()
  // O DR vem do token. Sem ele, `nuContrato` sozinho é recusado — e cotar sem
  // contrato devolveria o preço de balcão, que é justamente o que a integração
  // existe para não pagar. Melhor não cotar do que cotar caro.
  const dr = await getCorreiosDr()

  const { parcel } = request
  const base = {
    cepOrigem: request.originZip.replace(/\D/g, ''),
    cepDestino: request.destinationZip.replace(/\D/g, ''),
    psObjeto: inteiro(parcel.weightKg * 1000),
    tpObjeto: TIPO_PACOTE,
    comprimento: inteiro(parcel.lengthCm),
    largura: inteiro(parcel.widthCm),
    altura: inteiro(parcel.heightCm),
    vlDeclarado: String(Math.max(0, Math.round(request.declaredValue))),
  }

  // `nuRequisicao` é o índice, e é por ele que preço e prazo se casam de volta:
  // a resposta do lote não vem necessariamente na ordem em que foi pedida.
  const parametrosProduto: PrecoParam[] = CORREIOS_SERVICES.map((servico, i) => ({
    coProduto: servico.code,
    nuRequisicao: String(i),
    ...(dr !== null ? { nuContrato: contrato, nuDR: dr } : {}),
    ...base,
  }))

  const parametrosPrazo = CORREIOS_SERVICES.map((servico, i) => ({
    coProduto: servico.code,
    nuRequisicao: String(i),
    cepOrigem: base.cepOrigem,
    cepDestino: base.cepDestino,
  }))

  const [precos, prazos] = await Promise.all([
    correiosPost<PrecoResposta[]>(
      '/preco/v1/nacional',
      { idLote: '1', parametrosProduto },
      { contexto: 'cotação de preço' }
    ),
    correiosPost<PrazoResposta[]>(
      '/prazo/v1/nacional',
      { idLote: '1', parametrosPrazo },
      { contexto: 'cotação de prazo' }
    ),
  ])

  const prazoPorRequisicao = new Map<string, PrazoResposta>()
  for (const p of prazos ?? []) {
    if (p.nuRequisicao != null) prazoPorRequisicao.set(String(p.nuRequisicao), p)
  }

  const opcoes: CarrierQuote[] = []

  for (const preco of precos ?? []) {
    if (preco.nuRequisicao == null) continue

    const indice = Number(preco.nuRequisicao)
    const servico = CORREIOS_SERVICES[indice]
    if (!servico) continue

    // `txErro` é onde a recusa mora. O lote responde HTTP 206 quando parte
    // falhou, e 206 passa por `res.ok` — sem olhar aqui, um serviço recusado
    // viraria uma opção de preço zero no carrinho.
    //
    // A recusa mais comum é ERP-008 do Mini Envios, que não aceita nada acima de
    // ~24×16×4 cm. Isso é o serviço dizendo que não serve para este pacote, não
    // uma falha: ele sai da lista, e PAC e SEDEX seguem.
    if (preco.txErro) continue

    const prazo = prazoPorRequisicao.get(preco.nuRequisicao)
    // Preço sem prazo é opção que o cliente não sabe quando recebe. Fora.
    if (!prazo || prazo.txErro || !prazo.prazoEntrega) continue

    const valor = precoBrParaNumero(preco.pcFinal ?? '')
    if (valor <= 0) continue

    opcoes.push({
      carrier: 'correios',
      serviceCode: servico.code,
      name: servico.name,
      company: CORREIOS_COMPANY,
      price: valor,
      // Os Correios dão um prazo só, não uma faixa. Inventar uma janela aqui
      // seria inventar informação que a transportadora não deu.
      deliveryDaysMin: prazo.prazoEntrega,
      deliveryDaysMax: prazo.prazoEntrega,
    })
  }

  return opcoes
}
