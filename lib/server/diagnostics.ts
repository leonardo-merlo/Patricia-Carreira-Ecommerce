// Diagnóstico das integrações — usado por /admin/diagnostico.
//
// Regra que vale para o arquivo inteiro: NENHUMA função aqui devolve o valor de um
// segredo. Só presença, prefixo público (TEST-/APP_USR-) e o que a própria API do
// parceiro responde. O que sai daqui vai para a tela.

import { isValidCep, isValidCnpj, meDocumentFields, onlyDigits } from '@/lib/documento'
import { readEnv, readEnvOption } from '@/lib/env'
import { resolveShippingOrigin } from '@/lib/server/store-identity'
import { getStoreSettings, type StoreSettings } from '@/lib/server/store-settings'

export type EnvCheck = {
  name: string
  present: boolean
  required: boolean
  hint: string
}

export type EnvGroup = {
  title: string
  vars: EnvCheck[]
}

export type ServiceCheck = {
  service: string
  ok: boolean
  environment: string
  detail: string
}

export type WebhookUrl = {
  service: string
  /** URL completa, com token — só para o botão de copiar desta página admin */
  url: string
  /** o que aparece na tela: token reduzido aos 4 últimos caracteres */
  display: string
  where: string
  ready: boolean
}

export type SenderField = {
  label: string
  value: string
  ok: boolean
  note: string
}

export type Diagnostics = {
  appUrl: string | null
  appUrlIsPublic: boolean
  groups: EnvGroup[]
  services: ServiceCheck[]
  webhooks: WebhookUrl[]
  /** emitente da NF-e — endereço fiscal, do cartão CNPJ */
  fiscal: SenderField[]
  /** remetente da etiqueta — de onde a mercadoria sai */
  sender: SenderField[]
  missingRequired: string[]
}

// Corta o comentário inline: um valor colado do .env com `# comentário` junto
// tem length > 0 e aparecia como preenchido, deixando a tela verde enquanto a
// integração falhava com a variável vazia na prática.
function env(name: string): string {
  return readEnv(name)
}

function has(name: string): boolean {
  return env(name).length > 0
}

function check(name: string, required: boolean, hint: string): EnvCheck {
  return { name, present: has(name), required, hint }
}

// fetch com teto de tempo — um parceiro fora do ar não pode pendurar a página
async function fetchWithTimeout(url: string, init: RequestInit, ms = 8000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.name === 'AbortError' ? 'sem resposta em 8s' : err.message
  }
  return 'erro desconhecido'
}

// ─────────────────────────────────────────────────────────────────────────────
// Checagens vivas — cada uma chama a API do parceiro com o token configurado
// ─────────────────────────────────────────────────────────────────────────────

async function checkMercadoPago(): Promise<ServiceCheck> {
  const token = env('MERCADOPAGO_ACCESS_TOKEN')
  const environment = token.startsWith('TEST-')
    ? 'sandbox (TEST-)'
    : token.startsWith('APP_USR-')
      ? 'PRODUÇÃO (APP_USR-)'
      : 'indefinido'

  if (!token) {
    return { service: 'Mercado Pago', ok: false, environment, detail: 'MERCADOPAGO_ACCESS_TOKEN não definido' }
  }

  try {
    const res = await fetchWithTimeout('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      return { service: 'Mercado Pago', ok: false, environment, detail: `API respondeu ${res.status} — token inválido ou expirado` }
    }
    const data = (await res.json()) as { nickname?: string; site_id?: string }
    return {
      service: 'Mercado Pago',
      ok: true,
      environment,
      detail: `conta ${data.nickname ?? '—'} · site ${data.site_id ?? '—'}`,
    }
  } catch (err) {
    return { service: 'Mercado Pago', ok: false, environment, detail: describeError(err) }
  }
}

async function checkMelhorEnvio(): Promise<ServiceCheck> {
  const token = env('MELHOR_ENVIO_TOKEN')
  const base = env('MELHOR_ENVIO_BASE_URL') || 'https://melhorenvio.com.br/api/v2'
  const environment = base.includes('sandbox') ? 'sandbox' : 'PRODUÇÃO'

  if (!token) {
    return { service: 'Melhor Envio', ok: false, environment, detail: 'MELHOR_ENVIO_TOKEN não definido' }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': `${env('MELHOR_ENVIO_APP_NAME') || 'App'} (${env('MELHOR_ENVIO_CONTACT_EMAIL') || 'dev@app.com'})`,
  }

  try {
    const res = await fetchWithTimeout(`${base}/me`, { headers })
    if (!res.ok) {
      const motivo = res.status === 401 ? 'token inválido ou expirado (OAuth do ME vence)' : `API respondeu ${res.status}`
      return { service: 'Melhor Envio', ok: false, environment, detail: motivo }
    }
    const me = (await res.json()) as { firstname?: string; email?: string }

    // Saldo importa: o checkout da etiqueta debita a carteira. Zerada, a compra falha.
    let saldo = 'saldo indisponível'
    try {
      const balRes = await fetchWithTimeout(`${base}/me/balance`, { headers })
      if (balRes.ok) {
        const bal = (await balRes.json()) as { balance?: number }
        const valor = Number(bal.balance ?? 0)
        const formatado = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        saldo = `saldo R$ ${formatado}${valor <= 0 ? ' — sem saldo, a etiqueta não é comprada' : ''}`
      }
    } catch {
      // saldo é complementar; a conta já respondeu
    }

    return {
      service: 'Melhor Envio',
      ok: true,
      environment,
      detail: `conta ${me.firstname ?? me.email ?? '—'} · ${saldo}`,
    }
  } catch (err) {
    return { service: 'Melhor Envio', ok: false, environment, detail: describeError(err) }
  }
}

// Exportada para o botão "testar conexão" da tela de Fiscal, que precisa só
// desta checagem — rodar runDiagnostics inteiro chamaria quatro APIs à toa.
export async function checkFocusNfe(): Promise<ServiceCheck> {
  const token = env('FOCUS_NFE_TOKEN')
  const homologacao = readEnvOption('FOCUS_NFE_AMBIENTE') === 'homologacao'
  const host = homologacao ? 'homologacao.focusnfe.com.br' : 'api.focusnfe.com.br'
  // O host entra no rótulo: era a informação que faltava para enxergar de um olhar
  // que a requisição estava saindo para o ambiente errado.
  const environment = `${homologacao ? 'homologação' : 'PRODUÇÃO'} · ${host}`
  const base = `https://${host}/v2`

  if (!token) {
    return { service: 'Focus NFe', ok: false, environment, detail: 'FOCUS_NFE_TOKEN não definido' }
  }

  const auth = { Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}` }

  try {
    // A pergunta que importa é "esta credencial é aceita para emitir?". Consultar
    // uma referência que sabidamente não existe responde isso sem efeito colateral:
    // 404 = autenticou e só não achou a nota; 403 = credencial recusada.
    // (Não usar /empresas: ele só existe para o token principal da conta, e no host
    // de homologação responde 404 mesmo com token válido.)
    const probe = await fetchWithTimeout(`${base}/nfe/diagnostico-inexistente`, { headers: auth })
    const body = (await probe.json().catch(() => ({}))) as { codigo?: string; mensagem?: string }

    if (probe.status === 404 || probe.ok) {
      // "token aceito" não é "autorizado a emitir": o Focus só confere o CNPJ do
      // emitente na emissão, e responde 403 "CNPJ do emitente não autorizado" quando
      // o CNPJ do corpo não é o da empresa dona do token. Por isso o CNPJ configurado
      // entra aqui — foi o que deixou esta tela verde enquanto a emissão falhava.
      const settings = await getStoreSettings()
      const cnpjEmitente = onlyDigits(settings?.cnpj)
      const cnpjOk = isValidCnpj(cnpjEmitente)
      return {
        service: 'Focus NFe',
        ok: cnpjOk,
        environment,
        detail: cnpjOk
          ? `token aceito · emitente CNPJ ${cnpjEmitente} — a autorização deste CNPJ só é conferida na emissão`
          : `token aceito, mas o CNPJ da empresa ${cnpjEmitente ? `é inválido (${cnpjEmitente})` : 'não está preenchido em /admin/config/fiscal'} — a emissão falha com "CNPJ do emitente não autorizado"`,
      }
    }

    if (probe.status === 401 || probe.status === 403) {
      return {
        service: 'Focus NFe',
        ok: false,
        environment,
        detail: `token recusado: ${body.mensagem ?? body.codigo ?? 'confira se copiou o token deste ambiente'}`,
      }
    }

    // Qualquer outra coisa: mostrar o que o Focus disse, em vez de traduzir errado
    return {
      service: 'Focus NFe',
      ok: false,
      environment,
      detail: `HTTP ${probe.status}${body.mensagem ? ` — ${body.mensagem}` : ''}${body.codigo ? ` (${body.codigo})` : ''}`,
    }
  } catch (err) {
    return { service: 'Focus NFe', ok: false, environment, detail: describeError(err) }
  }
}

async function checkResend(): Promise<ServiceCheck> {
  const key = env('RESEND_API_KEY')
  const environment = env('RESEND_FROM') || 'remetente não definido'

  if (!key) {
    return { service: 'Resend', ok: false, environment, detail: 'RESEND_API_KEY não definida' }
  }

  try {
    const res = await fetchWithTimeout('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    })

    // Chave com permissão apenas de envio (o caso normal aqui) não lista domínios.
    // Isso é a chave funcionando, não falhando — só não dá para conferir o domínio.
    if (res.status === 401 || res.status === 403) {
      const body = (await res.json().catch(() => ({}))) as { name?: string }
      if (body.name === 'restricted_api_key') {
        return {
          service: 'Resend',
          ok: true,
          environment,
          detail: 'chave válida, restrita a envio — domínio não verificável por aqui',
        }
      }
      return { service: 'Resend', ok: false, environment, detail: 'chave recusada pela API' }
    }

    if (!res.ok) {
      return { service: 'Resend', ok: false, environment, detail: `API respondeu ${res.status}` }
    }

    const data = (await res.json()) as { data?: Array<{ name?: string; status?: string }> }
    const domains = data.data ?? []
    const verified = domains.filter((d) => d.status === 'verified').map((d) => d.name)
    return {
      service: 'Resend',
      ok: verified.length > 0,
      environment,
      detail: verified.length > 0
        ? `domínio verificado: ${verified.join(', ')}`
        : 'nenhum domínio verificado — o email não sai',
    }
  } catch (err) {
    return { service: 'Resend', ok: false, environment, detail: describeError(err) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function buildGroups(): EnvGroup[] {
  return [
    {
      title: 'Aplicação e banco',
      vars: [
        check('NEXT_PUBLIC_APP_URL', true, 'precisa ser a URL pública — em localhost o MP não recebe notification_url'),
        check('NEXT_PUBLIC_SUPABASE_URL', true, 'projeto Supabase'),
        check('NEXT_PUBLIC_SUPABASE_ANON_KEY', true, 'chave pública do Supabase'),
        check('SUPABASE_SERVICE_ROLE_KEY', true, 'usada pelos webhooks, que não têm sessão'),
      ],
    },
    {
      title: 'Mercado Pago',
      vars: [
        check('MERCADOPAGO_ACCESS_TOKEN', true, 'token do servidor'),
        check('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', true, 'usada pelo SDK do checkout para tokenizar o cartão'),
        check('MERCADOPAGO_WEBHOOK_SECRET', true, 'sem ela o webhook devolve 401 em toda notificação'),
      ],
    },
    {
      title: 'Melhor Envio',
      vars: [
        check('MELHOR_ENVIO_TOKEN', true, 'token OAuth — expira, precisa renovar no painel'),
        check('MELHOR_ENVIO_BASE_URL', true, 'sandbox ou produção'),
        check('MELHOR_ENVIO_WEBHOOK_SECRET', true, 'vai na query string da URL de callback'),
        check('MELHOR_ENVIO_APP_NAME', false, 'identificação no User-Agent'),
        check('MELHOR_ENVIO_CONTACT_EMAIL', false, 'identificação no User-Agent'),
      ],
    },
    {
      title: 'Focus NFe',
      vars: [
        check('FOCUS_NFE_TOKEN', true, 'token do ambiente escolhido'),
        check('FOCUS_NFE_AMBIENTE', true, 'homologacao ou producao'),
        check('FOCUS_NFE_WEBHOOK_SECRET', true, 'vai na query string da URL de callback'),
      ],
    },
    {
      title: 'Email',
      vars: [
        check('RESEND_API_KEY', true, 'emails transacionais'),
        check('RESEND_FROM', true, 'remetente verificado no Resend'),
      ],
    },
    {
      // Endereço e identidade da empresa deixaram de morar aqui: viraram campos de
      // /admin/config (fiscal e envio). Estas variáveis continuam sendo lidas só
      // como rede enquanto o endereço de origem não estiver completo no painel —
      // nenhuma delas é obrigatória, e o cartão "Remetente do frete" abaixo diz
      // qual das duas fontes está valendo agora.
      title: 'Endereço antigo (rede de segurança — pode ser removido)',
      vars: [
        check('STORE_NOME', false, 'substituído por Razão social em /admin/config/fiscal'),
        check('STORE_CNPJ', false, 'substituído pelo CNPJ em /admin/config/fiscal'),
        check('STORE_DOCUMENTO', false, 'substituído pelo CNPJ em /admin/config/fiscal'),
        check('STORE_IE', false, 'substituído pela Inscrição Estadual em /admin/config/fiscal'),
        check('STORE_TELEFONE', false, 'substituído pelo contato em /admin/config/envio'),
        check('STORE_EMAIL', false, 'substituído pelo contato em /admin/config/envio'),
        check('STORE_LOGRADOURO', false, 'substituído pelo endereço de origem em /admin/config/envio'),
        check('STORE_NUMERO', false, 'substituído pelo endereço de origem em /admin/config/envio'),
        check('STORE_BAIRRO', false, 'substituído pelo endereço de origem em /admin/config/envio'),
        check('STORE_CIDADE', false, 'substituído pelo endereço de origem em /admin/config/envio'),
        check('STORE_ESTADO', false, 'não define mais CFOP — quem define é a UF fiscal'),
        check('STORE_CEP_ORIGEM', false, 'substituído pelo CEP de origem em /admin/config/envio'),
      ],
    },
  ]
}

function maskToken(secret: string): string {
  return secret.length <= 4 ? '••••' : `${'•'.repeat(8)}${secret.slice(-4)}`
}

function buildWebhooks(appUrl: string | null, appUrlIsPublic: boolean): WebhookUrl[] {
  const base = appUrlIsPublic && appUrl ? appUrl.replace(/\/$/, '') : null
  const meSecret = env('MELHOR_ENVIO_WEBHOOK_SECRET')
  const nfeSecret = env('FOCUS_NFE_WEBHOOK_SECRET')

  const semBase = '— defina NEXT_PUBLIC_APP_URL com a URL pública'
  const mpUrl = base ? `${base}/api/webhooks/payment` : semBase

  return [
    {
      service: 'Mercado Pago',
      url: mpUrl,
      display: mpUrl,
      where: 'Suas integrações › aplicação › Webhooks › evento Pagamentos',
      ready: Boolean(base) && has('MERCADOPAGO_WEBHOOK_SECRET'),
    },
    {
      service: 'Melhor Envio',
      url: base && meSecret ? `${base}/api/webhooks/shipping?token=${meSecret}` : semBase,
      display: base && meSecret
        ? `${base}/api/webhooks/shipping?token=${maskToken(meSecret)}`
        : '— falta URL pública ou MELHOR_ENVIO_WEBHOOK_SECRET',
      where: 'Painel do ME › Configurações › Webhooks',
      ready: Boolean(base) && Boolean(meSecret),
    },
    {
      service: 'Focus NFe',
      url: base && nfeSecret ? `${base}/api/webhooks/nfe?token=${nfeSecret}` : semBase,
      display: base && nfeSecret
        ? `${base}/api/webhooks/nfe?token=${maskToken(nfeSecret)}`
        : '— falta URL pública ou FOCUS_NFE_WEBHOOK_SECRET',
      where: 'Painel do Focus › Configurações › URL de callback',
      ready: Boolean(base) && Boolean(nfeSecret),
    },
  ]
}

// As duas identidades da loja, lado a lado. Estão em cartões separados de
// propósito: enquanto eram os mesmos valores ninguém percebeu que a empresa
// mudou de estado e a nota continuou saindo com a UF da loja.
//
// Nenhum destes campos é credencial — são dados públicos do cartão CNPJ e do
// endereço de coleta —, então o valor resolvido aparece na tela. Foi a ausência
// disso que deixou o diagnóstico verde enquanto a emissão falhava.

function campo(label: string, value: string, ok: boolean, note: string): SenderField {
  return { label, value: value || '(vazio)', ok, note }
}

/** Emitente da NF-e: o que vai impresso na nota e o que decide o CFOP. */
function buildFiscal(settings: StoreSettings | null): SenderField[] {
  const cnpj = onlyDigits(settings?.cnpj)
  const uf = (settings?.fiscal_state ?? '').trim().toUpperCase()
  const cep = onlyDigits(settings?.fiscal_zip)
  const logradouro = `${settings?.fiscal_street ?? ''} ${settings?.fiscal_number ?? ''}`.trim()
  const ondePreencher = 'preencha em /admin/config/fiscal, com o cartão CNPJ'

  return [
    campo('CNPJ', cnpj, isValidCnpj(cnpj),
      isValidCnpj(cnpj)
        ? 'dígito verificador confere — precisa ser o CNPJ da empresa dona do token Focus'
        : `CNPJ vazio ou inválido — o Focus recusa com "CNPJ do emitente não autorizado". ${ondePreencher}`),
    campo('Razão social', (settings?.legal_name ?? '').trim(), Boolean((settings?.legal_name ?? '').trim()),
      `como a empresa está registrada, não o nome da marca. ${ondePreencher}`),
    campo('Inscrição Estadual', (settings?.state_registration ?? '').trim(), Boolean((settings?.state_registration ?? '').trim()),
      `número da IE ou a palavra ISENTO. A SEFAZ exige IE do mesmo estado do endereço fiscal. ${ondePreencher}`),
    campo('Logradouro e número', logradouro, Boolean((settings?.fiscal_street ?? '').trim() && (settings?.fiscal_number ?? '').trim()),
      `endereço do cartão CNPJ. ${ondePreencher}`),
    campo('Bairro', (settings?.fiscal_district ?? '').trim(), Boolean((settings?.fiscal_district ?? '').trim()), ondePreencher),
    campo('Cidade', (settings?.fiscal_city ?? '').trim(), Boolean((settings?.fiscal_city ?? '').trim()), ondePreencher),
    campo('Estado (define o CFOP)', uf, uf.length === 2,
      uf.length === 2
        ? `venda para ${uf} sai com CFOP 5102 (dentro do estado); para qualquer outra UF, 6102`
        : `sem a UF fiscal o CFOP não pode ser decidido. ${ondePreencher}`),
    campo('CEP', cep, isValidCep(cep), isValidCep(cep) ? '8 dígitos' : `precisa ter 8 dígitos. ${ondePreencher}`),
    campo('Regime tributário', String(settings?.tax_regime ?? 1), true, '1 = Simples Nacional'),
  ]
}

/** Remetente da etiqueta: o que é enviado ao Melhor Envio, e de qual fonte veio. */
function buildSender(settings: StoreSettings | null): SenderField[] {
  const origem = resolveShippingOrigin(settings)
  const doc = meDocumentFields(origem.cnpj)
  const docOk = Boolean(doc.company_document || doc.document)
  const daConfiguracao = origem.source === 'configuracao'

  const linhas: SenderField[] = [
    campo(
      'Fonte do endereço',
      daConfiguracao ? 'painel (/admin/config/envio)' : 'variáveis STORE_* (rede antiga)',
      true,
      daConfiguracao
        ? 'endereço de origem completo no painel — é ele que vale'
        : 'o endereço de origem no painel ainda está incompleto, então valem as variáveis antigas. Completar em /admin/config/envio tira essa dependência.'
    ),
    campo(
      'Documento enviado ao ME',
      doc.company_document ? `CNPJ ${doc.company_document}` : doc.document ? `CPF ${doc.document}` : origem.cnpj,
      docOk,
      docOk ? 'dígito verificador confere' : 'nenhum documento válido — o ME recusa o pedido com 422'
    ),
    campo('CEP de origem', origem.endereco.zip, isValidCep(origem.endereco.zip),
      isValidCep(origem.endereco.zip)
        ? 'mesmo CEP usado na cotação do carrinho e na compra da etiqueta'
        : 'precisa ter 8 dígitos, só números'),
    campo('Estado', origem.endereco.state, origem.endereco.state.length === 2, 'sigla de 2 letras'),
    campo('Cidade', origem.endereco.city, Boolean(origem.endereco.city), 'obrigatória'),
    campo('Logradouro e número', `${origem.endereco.street} ${origem.endereco.number}`.trim(),
      Boolean(origem.endereco.street && origem.endereco.number), 'obrigatórios'),
    campo('Bairro', origem.endereco.district, Boolean(origem.endereco.district), 'obrigatório'),
  ]

  // Divergência entre as duas fontes não pode passar em silêncio: é exatamente
  // assim que a cotação e a coleta saíam de endereços diferentes.
  for (const aviso of origem.warnings) {
    linhas.push(campo('Atenção', 'divergência de configuração', false, aviso))
  }

  return linhas
}

export async function runDiagnostics(): Promise<Diagnostics> {
  const appUrl = env('NEXT_PUBLIC_APP_URL') || null
  const appUrlIsPublic = Boolean(
    appUrl && appUrl.startsWith('https://') && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')
  )

  const groups = buildGroups()
  const missingRequired = groups
    .flatMap((g) => g.vars)
    .filter((v) => v.required && !v.present)
    .map((v) => v.name)

  const settings = await getStoreSettings()

  const services = await Promise.all([
    checkMercadoPago(),
    checkMelhorEnvio(),
    checkFocusNfe(),
    checkResend(),
  ])

  return {
    appUrl,
    appUrlIsPublic,
    groups,
    services,
    webhooks: buildWebhooks(appUrl, appUrlIsPublic),
    fiscal: buildFiscal(settings),
    sender: buildSender(settings),
    missingRequired,
  }
}
