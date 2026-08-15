import { requireAdmin } from './auth'
import { getStoreSettings, type StoreSettings } from './store-settings'

/**
 * Configurações para as páginas de /admin/config. O middleware já barra quem não
 * é admin, mas repetir a checagem aqui é barato e mantém a regra junto do dado.
 */
export async function loadSettingsForAdmin(): Promise<StoreSettings | null> {
  await requireAdmin()
  return getStoreSettings()
}
