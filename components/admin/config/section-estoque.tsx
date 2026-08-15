"use client" // ToggleList salva na hora

import type { StoreSettings } from '@/lib/actions/settings'
import { ToggleList } from './config-parts'

export function SectionEstoque({ settings }: { settings: StoreSettings }) {
  return (
    <div className="card">
      <div className="card-header"><h3 className="ttl">Alertas de estoque</h3></div>
      <div className="card-body">
        <ToggleList
          settings={settings}
          items={[
            { key: 'alert_finished_stock',     label: 'Alertar quando produto acabado atingir estoque mínimo' },
            { key: 'alert_raw_material',       label: 'Alertar quando matéria-prima atingir estoque mínimo' },
            { key: 'block_sale_zero_stock',    label: 'Bloquear venda quando estoque = 0 (varejo)' },
            { key: 'allow_wholesale_no_stock', label: 'Permitir pedido atacado sem estoque (produzir sob demanda)' },
            { key: 'show_low_stock_warning',   label: 'Exibir aviso de poucas unidades na loja (≤ 3 un.)' },
          ]}
        />
      </div>
    </div>
  )
}
