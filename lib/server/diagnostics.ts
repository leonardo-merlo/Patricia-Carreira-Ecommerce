// Diagnóstico das integrações — usado por /admin/diagnostico.
//
// Regra que vale para o arquivo inteiro: NENHUMA função aqui devolve o valor de um
// segredo. Só presença, prefixo público (TEST-/APP_USR-) e o que a própria API do
// parceiro responde. O que sai daqui vai para a tela.

import { isValidCep, meDocumentFields, onlyDigits } from '@/lib/documento'

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
  sender: SenderField[]
  missingRequired: string[]
}

function env(name: string): string {
  return (process.env[name] ?? '').trim()
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
  const homologacao = env('FOCUS_NFE_AMBIENTE') === 'homologacao'
  const environment = homologacao ? 'homologação' : 'PRODUÇÃO'
  const base = homologacao ? 'https://homologacao.focusnfe.com.br/v2' : 'https://api.focusnfe.com.br/v2'

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
      return {
        service: 'Focus NFe',
        ok: true,
        environment,
        detail: 'token aceito pela API — pronto para tentar emitir',
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
        check('FOCUS_NFE_REGIME_TRIBUTARIO', false, '1 = Simples Nacional'),
      ],
    },
    {
      title: 'Emitente da NF-e',
      vars: [
        check('STORE_CNPJ', true, 'sem CNPJ a nota não é emitida'),
        check('STORE_IE', true, 'inscrição estadual ou ISENTO'),
        check('STORE_NOME', true, 'razão social no emitente'),
        check('STORE_LOGRADOURO', true, 'endereço do emitente'),
        check('STORE_NUMERO', true, 'endereço do emitente'),
        check('STORE_BAIRRO', true, 'endereço do emitente'),
        check('STORE_CIDADE', true, 'endereço do emitente'),
        check('STORE_ESTADO', true, 'define CFOP 5102 (dentro do estado) ou 6102'),
        check('STORE_CEP_ORIGEM', true, 'origem do frete e CEP do emitente'),
      ],
    },
    {
      title: 'Remetente do frete e email',
      vars: [
        check('STORE_DOCUMENTO', true, 'CPF/CNPJ do remetente no Melhor Envio'),
        check('STORE_TELEFONE', true, 'telefone do remetente'),
        check('STORE_EMAIL', true, 'email do remetente'),
        check('RESEND_API_KEY', true, 'emails transacionais'),
        check('RESEND_FROM', true, 'remetente verificado no Resend'),
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

// O remetente é o que o Melhor Envio mais recusa: ele valida dígito de CPF/CNPJ
// e formato de CEP, e devolve 422 com o pedido inteiro barrado. Mostrar o valor
// resolvido aqui (dado público da loja, não credencial) evita adivinhação.
function buildSender(): SenderField[] {
  const cnpj = onlyDigits(process.env.STORE_CNPJ)
  const documento = onlyDigits(process.env.STORE_DOCUMENTO)
  const cep = onlyDigits(process.env.STORE_CEP_ORIGEM)
  const uf = (process.env.STORE_ESTADO ?? '').trim().toUpperCase()

  const docFields = meDocumentFields(cnpj || documento)
  const docOk = Boolean(docFields.company_document || docFields.document)

  return [
    {
      label: 'Documento enviado ao ME',
      value: docFields.company_document
        ? `CNPJ ${docFields.company_document}`
        : docFields.document
          ? `CPF ${docFields.document}`
          : cnpj || documento || '(vazio)',
      ok: docOk,
      note: docOk
        ? 'dígito verificador confere'
        : 'nenhum documento válido — o ME recusa o pedido com 422',
    },
    {
      label: 'CEP de origem',
      value: cep || '(vazio)',
      ok: isValidCep(cep),
      note: isValidCep(cep) ? '8 dígitos' : 'precisa ter 8 dígitos, só números',
    },
    { label: 'Estado', value: uf || '(vazio)', ok: uf.length === 2, note: 'sigla de 2 letras' },
    {
      label: 'Cidade',
      value: process.env.STORE_CIDADE ?? '(vazio)',
      ok: Boolean((process.env.STORE_CIDADE ?? '').trim()),
      note: 'obrigatória',
    },
    {
      label: 'Logradouro e número',
      value: `${process.env.STORE_LOGRADOURO ?? ''} ${process.env.STORE_NUMERO ?? ''}`.trim() || '(vazio)',
      ok: Boolean((process.env.STORE_LOGRADOURO ?? '').trim() && (process.env.STORE_NUMERO ?? '').trim()),
      note: 'obrigatórios',
    },
    {
      label: 'Bairro',
      value: process.env.STORE_BAIRRO ?? '(vazio)',
      ok: Boolean((process.env.STORE_BAIRRO ?? '').trim()),
      note: 'obrigatório',
    },
  ]
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
    sender: buildSender(),
    missingRequired,
  }
}
