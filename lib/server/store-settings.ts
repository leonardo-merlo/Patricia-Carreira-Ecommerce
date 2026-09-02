import { createServiceClient } from '@/lib/supabase/service'

export type StoreSettings = {
  id: string
  store_name: string
  store_slogan: string | null
  store_description: string | null
  contact_email: string | null
  contact_phone: string | null
  logo_url: string | null
  /** CNPJ canônico da empresa — emitente da NF-e e remetente no Melhor Envio */
  cnpj: string | null
  address_full: string | null

  // Identidade jurídica (uma só: quem emite a nota é quem assina a etiqueta)
  legal_name: string | null
  state_registration: string | null
  cnae: string | null
  tax_regime: number

  // Endereço fiscal — cartão CNPJ. Vai impresso na nota e define o CFOP.
  fiscal_street: string | null
  fiscal_number: string | null
  fiscal_complement: string | null
  fiscal_district: string | null
  fiscal_city: string | null
  fiscal_state: string | null
  fiscal_zip: string | null

  // Origem do frete — de onde a mercadoria sai. origin_cep é o CEP deste bloco;
  // manteve o nome antigo para não quebrar a tela de envio nem a cotação.
  origin_same_as_fiscal: boolean
  origin_street: string | null
  origin_number: string | null
  origin_complement: string | null
  origin_district: string | null
  origin_city: string | null
  origin_state: string | null
  origin_contact_name: string | null
  origin_phone: string | null
  origin_email: string | null
  origin_cep: string | null
  shipping_extra_days: number
  free_shipping_threshold: number
  enabled_carriers: string[]
  auto_nfe_retail: boolean
  send_danfe_email: boolean
  manual_nfe_wholesale: boolean
  alert_finished_stock: boolean
  alert_raw_material: boolean
  block_sale_zero_stock: boolean
  allow_wholesale_no_stock: boolean
  show_low_stock_warning: boolean
  notif_order_confirmed: boolean
  notif_order_shipped: boolean
  notif_order_delivered: boolean
  notif_order_cancelled: boolean
  notif_new_customer: boolean
  notif_new_order: boolean
  notif_payment_confirmed: boolean
  notif_low_stock: boolean
  notif_low_material: boolean
  /** Janela do aviso de conta a pagar: dias antes do vencimento e dias de tolerância. */
  notif_bill_days_ahead: number
  notif_bill_grace_days: number
  bank_name: string | null
  bank_account_type: string | null
  bank_agency: string | null
  bank_account: string | null
  updated_at: string
}

export type SettingsUpdate = Partial<Omit<StoreSettings, 'id' | 'updated_at'>>

/**
 * Lido pelo rodapé, ou seja, por toda página da loja. Cacheado por 60s de
 * propósito: com leitura sem cache aqui, nenhuma página consegue ser estática.
 * Quem salva a configuração revalida na hora, então o painel não fica atrasado.
 *
 * `fresh` desliga o cache. Usado só pela emissão de NF-e: dado fiscal de 60
 * segundos atrás pode ser um endereço que acabou de ser corrigido, e nota
 * emitida errada não tem desfazer.
 */
export async function getStoreSettings(
  opts?: { fresh?: boolean }
): Promise<StoreSettings | null> {
  const supabase = createServiceClient(opts?.fresh ? undefined : { revalidateSeconds: 60 })
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .single()

  if (error) {
    console.error('[getStoreSettings]', error.message)
    return null
  }
  return data as StoreSettings
}
