// Quem é a loja: identidade jurídica, endereço fiscal e origem do frete.
//
// Este arquivo existe porque as três coisas eram uma só. As mesmas sete variáveis
// STORE_* montavam o emitente da NF-e e o remetente da etiqueta, e o CFOP saía da
// comparação com STORE_ESTADO. Enquanto a empresa e a loja ficavam no mesmo lugar
// isso passou; com a sede em Minas Gerais e a loja em Arraial d'Ajuda a nota
// passou a sair com a UF errada e toda venda para a Bahia com CFOP 5102.
//
// A separação real é em três, não em duas:
//   1. identidade jurídica — CNPJ, razão social, IE. Uma só: quem emite a nota é
//      quem assina a etiqueta;
//   2. endereço fiscal — sai do cartão CNPJ, define o CFOP, vai impresso na nota;
//   3. origem do frete — de onde a mercadoria sai, o que o Melhor Envio coleta.
//
// Regra que vale para o arquivo: o emitente falha fechado (sem endereço completo
// não existe nota), a origem do frete degrada (cai nas variáveis antigas), porque
// parar de vender é pior que despachar do endereço de ontem.

import { isValidCep, isValidCnpj, onlyDigits } from '@/lib/documento'
import { readEnv } from '@/lib/env'
import { getStoreSettings, type StoreSettings } from '@/lib/server/store-settings'

export type PostalAddress = {
  street: string
  number: string
  complement: string
  district: string
  city: string
  /** sigla de 2 letras, maiúscula */
  state: string
  /** só dígitos */
  zip: string
}

export type Emitente = {
  cnpj: string
  inscricaoEstadual: string
  nome: string
  regimeTributario: number
  endereco: PostalAddress
}

/** De onde o endereço de origem foi resolvido — mostrado em /admin/diagnostico. */
export type OriginSource = 'configuracao' | 'variaveis-antigas'

export type ShippingOrigin = {
  name: string
  phone: string
  email: string
  /** CNPJ da loja, só dígitos; vazio quando não há documento válido */
  cnpj: string
  endereco: PostalAddress
  source: OriginSource
  /** divergências que a tela de diagnóstico precisa mostrar */
  warnings: string[]
}

export type EmitenteResult =
  | { ok: true; emitente: Emitente }
  | { ok: false; missing: string[] }

const EMPTY_ADDRESS: PostalAddress = {
  street: '', number: '', complement: '', district: '', city: '', state: '', zip: '',
}

function texto(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function uf(value: string | null | undefined): string {
  return texto(value).toUpperCase()
}

/**
 * Endereço serve para emitir nota e para o transportador coletar. Faltando
 * qualquer campo, os dois usos quebram — por isso a checagem é do bloco inteiro,
 * nunca campo a campo. Complemento fica de fora: endereço sem complemento é
 * comum e válido.
 */
export function isCompleteAddress(address: PostalAddress): boolean {
  return Boolean(
    address.street &&
      address.number &&
      address.district &&
      address.city &&
      address.state.length === 2 &&
      isValidCep(address.zip)
  )
}

function fiscalAddress(settings: StoreSettings): PostalAddress {
  return {
    street: texto(settings.fiscal_street),
    number: texto(settings.fiscal_number),
    complement: texto(settings.fiscal_complement),
    district: texto(settings.fiscal_district),
    city: texto(settings.fiscal_city),
    state: uf(settings.fiscal_state),
    zip: onlyDigits(settings.fiscal_zip),
  }
}

function originAddress(settings: StoreSettings): PostalAddress {
  return {
    street: texto(settings.origin_street),
    number: texto(settings.origin_number),
    complement: texto(settings.origin_complement),
    district: texto(settings.origin_district),
    city: texto(settings.origin_city),
    state: uf(settings.origin_state),
    // O CEP de origem já morava em origin_cep antes desta separação e continua
    // aqui: é o campo que o Henrique edita em /admin/config/envio.
    zip: onlyDigits(settings.origin_cep),
  }
}

/** Endereço das variáveis STORE_* — a rede enquanto a configuração não está completa. */
function legacyEnvAddress(): PostalAddress {
  return {
    street: readEnv('STORE_LOGRADOURO'),
    number: readEnv('STORE_NUMERO'),
    complement: readEnv('STORE_COMPLEMENTO'),
    district: readEnv('STORE_BAIRRO'),
    city: readEnv('STORE_CIDADE'),
    state: uf(readEnv('STORE_ESTADO')),
    zip: onlyDigits(readEnv('STORE_CEP_ORIGEM')),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Emitente da NF-e — falha fechado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Puro: recebe a configuração e devolve o emitente ou a lista do que falta.
 * Sem fallback para variável de ambiente de propósito. Emitir documento fiscal
 * com endereço pela metade é pior que não emitir, e um fallback silencioso é
 * exatamente como a UF errada entrou na nota sem ninguém ver.
 */
export function resolveEmitente(settings: StoreSettings | null): EmitenteResult {
  if (!settings) {
    return { ok: false, missing: ['configuração da loja (nenhum registro encontrado)'] }
  }

  const missing: string[] = []
  const cnpj = onlyDigits(settings.cnpj)
  if (!isValidCnpj(cnpj)) missing.push('CNPJ')

  const nome = texto(settings.legal_name)
  // Razão social, não o nome da marca: a SEFAZ compara com o cadastro do CNPJ, e
  // store_name é "Patrícia Carreira", que é como a loja se apresenta, não como a
  // empresa está registrada.
  if (!nome) missing.push('Razão social')

  const inscricaoEstadual = texto(settings.state_registration)
  if (!inscricaoEstadual) missing.push('Inscrição Estadual (ou ISENTO)')

  const endereco = fiscalAddress(settings)
  if (!endereco.street) missing.push('Logradouro do endereço fiscal')
  if (!endereco.number) missing.push('Número do endereço fiscal')
  if (!endereco.district) missing.push('Bairro do endereço fiscal')
  if (!endereco.city) missing.push('Cidade do endereço fiscal')
  if (endereco.state.length !== 2) missing.push('Estado do endereço fiscal')
  if (!isValidCep(endereco.zip)) missing.push('CEP do endereço fiscal')

  if (missing.length > 0) return { ok: false, missing }

  return {
    ok: true,
    emitente: {
      cnpj,
      inscricaoEstadual,
      nome,
      regimeTributario: settings.tax_regime ?? 1,
      endereco,
    },
  }
}

/**
 * Emitente validado. Lança nomeando o campo e a tela — a mensagem vai parar no
 * `nfe_status = 'erro'` do pedido, e "CNPJ do emitente não autorizado" já custou
 * dias de investigação por não dizer qual dado estava faltando.
 */
export async function getEmitente(): Promise<Emitente> {
  const settings = await getStoreSettings({ fresh: true })
  const result = resolveEmitente(settings)

  if (!result.ok) {
    throw new Error(
      `[NF-e] Dados fiscais incompletos — falta: ${result.missing.join(', ')}. ` +
        'Preencha em /admin/config/fiscal, com os dados do cartão CNPJ.'
    )
  }
  return result.emitente
}

// ─────────────────────────────────────────────────────────────────────────────
// Origem do frete — uma fonte só para cotação e etiqueta
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Puro: resolve de onde a mercadoria sai.
 *
 * Existe uma função só porque antes existiam duas leituras: o carrinho cotava
 * pelo `origin_cep` do banco e a etiqueta comprava pelo `STORE_CEP_ORIGEM` da
 * Vercel. Bastava editar o CEP na tela para o cliente ser cotado de um endereço
 * e a coleta ser agendada em outro, sem erro em lugar nenhum.
 */
export function resolveShippingOrigin(settings: StoreSettings | null): ShippingOrigin {
  const warnings: string[] = []

  const configurado = settings
    ? settings.origin_same_as_fiscal
      ? fiscalAddress(settings)
      : originAddress(settings)
    : EMPTY_ADDRESS

  const legado = legacyEnvAddress()
  const usaConfiguracao = isCompleteAddress(configurado)

  let endereco: PostalAddress
  let source: OriginSource

  if (usaConfiguracao) {
    endereco = configurado
    source = 'configuracao'
  } else {
    // Bloco incompleto: a etiqueta continua saindo pelas variáveis antigas. Mas o
    // CEP salvo na tela é uma decisão explícita de quem configurou e não pode ser
    // ignorada em silêncio — ele vence, e a divergência aparece no diagnóstico.
    const cepConfigurado = configurado.zip
    const cepDivergente = Boolean(cepConfigurado) && cepConfigurado !== legado.zip

    if (cepDivergente) {
      warnings.push(
        `O CEP salvo na configuração (${cepConfigurado}) é diferente do CEP das variáveis antigas (${legado.zip || 'vazio'}). ` +
          'Vale o da configuração, mas o resto do endereço ainda vem das variáveis — complete o endereço de origem em /admin/config/envio.'
      )
    }

    endereco = { ...legado, zip: cepConfigurado || legado.zip }
    source = 'variaveis-antigas'
  }

  if (settings && settings.origin_same_as_fiscal && !isCompleteAddress(fiscalAddress(settings))) {
    warnings.push(
      'A origem do frete está marcada como igual ao endereço fiscal, mas o endereço fiscal ainda não está completo.'
    )
  }

  // Contato e documento são lenientes: o Melhor Envio só precisa de algo válido
  // para identificar o remetente, e nenhum deles muda para onde o pacote vai.
  const cnpj = onlyDigits(settings?.cnpj) || onlyDigits(readEnv('STORE_CNPJ')) || onlyDigits(readEnv('STORE_DOCUMENTO'))

  return {
    name:
      texto(settings?.origin_contact_name) ||
      texto(settings?.legal_name) ||
      texto(settings?.store_name) ||
      readEnv('STORE_NOME') ||
      'Patricia Carreira',
    phone: onlyDigits(settings?.origin_phone) || onlyDigits(settings?.contact_phone) || onlyDigits(readEnv('STORE_TELEFONE')),
    email:
      texto(settings?.origin_email) ||
      texto(settings?.contact_email) ||
      readEnv('STORE_EMAIL'),
    cnpj,
    endereco,
    source,
    warnings,
  }
}

/** Origem do frete resolvida. Usada pela cotação do carrinho e pela etiqueta. */
export async function getShippingOrigin(): Promise<ShippingOrigin> {
  const settings = await getStoreSettings()
  return resolveShippingOrigin(settings)
}
