import { createServiceClient } from '@/lib/supabase/service'

export type StoreSettings = {
  id: string
  store_name: string
  store_slogan: string | null
  store_description: string | null
  contact_email: string | null
  contact_phone: string | null
  logo_url: string | null
  cnpj: string | null
  address_full: string | null
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
  updated_at: string
}

export type SettingsUpdate = Partial<Omit<StoreSettings, 'id' | 'updated_at'>>

/**
 * Lido pelo rodapé, ou seja, por toda página da loja. Cacheado por 60s de
 * propósito: com leitura sem cache aqui, nenhuma página consegue ser estática.
 * Quem salva a configuração revalida na hora, então o painel não fica atrasado.
 */
export async function getStoreSettings(): Promise<StoreSettings | null> {
  const supabase = createServiceClient({ revalidateSeconds: 60 })
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
