"use client" // formulário da janela de aviso

import { useState } from 'react'
import { updateStoreSettings, type StoreSettings } from '@/lib/actions/settings'
import { SaveRow, ToggleList, useSaveState } from './config-parts'

export function SectionNotificacoes({ settings }: { settings: StoreSettings }) {
  const { saving, saved, error, run } = useSaveState()
  const [daysAhead, setDaysAhead] = useState(String(settings.notif_bill_days_ahead))
  const [graceDays, setGraceDays] = useState(String(settings.notif_bill_grace_days))

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Avisos no painel</h3></div>
        <div className="card-body">
          <div className="cust-meta" style={{ marginBottom: 12 }}>
            Aparecem no sino da barra lateral. Desligar aqui esconde o tipo inteiro.
          </div>
          <ToggleList
            settings={settings}
            items={[
              { key: 'notif_new_order',     label: 'Novo pedido recebido (varejo e atacado)' },
              { key: 'notif_low_stock',     label: 'Produto acabado abaixo do estoque mínimo' },
              { key: 'notif_low_material',  label: 'Matéria-prima abaixo do estoque mínimo' },
            ]}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Contas a pagar</h3></div>
        <div className="card-body">
          <div className="cust-meta" style={{ marginBottom: 12 }}>
            A conta começa a avisar alguns dias antes do vencimento e continua
            avisando por alguns dias depois, até ser marcada como paga.
          </div>
          <div className="config-grid-2">
            <div className="field">
              <label htmlFor="cfg-dias-antes">Avisar quantos dias antes</label>
              <input className="input" id="cfg-dias-antes" type="number" min={0} max={60}
                value={daysAhead} onChange={(e) => setDaysAhead(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cfg-dias-tolerancia">Continuar avisando por (dias após vencer)</label>
              <input className="input" id="cfg-dias-tolerancia" type="number" min={0} max={30}
                value={graceDays} onChange={(e) => setGraceDays(e.target.value)} />
            </div>
          </div>
          {error && <div className="alert alert-error" style={{ fontSize: 12, marginTop: 10 }}>{error}</div>}
        </div>
        <SaveRow
          saving={saving}
          saved={saved}
          id="btn-salvar-janela-contas"
          onSave={() => run(() => updateStoreSettings({
            // O banco recusa fora de 0–60 e 0–30; limitar aqui evita a ida à toa.
            notif_bill_days_ahead: Math.min(60, Math.max(0, Number(daysAhead) || 0)),
            notif_bill_grace_days: Math.min(30, Math.max(0, Number(graceDays) || 0)),
          }))}
        />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">E-mail para a cliente (Resend)</h3></div>
        <div className="card-body">
          <ToggleList
            settings={settings}
            items={[
              { key: 'notif_order_confirmed', label: 'Confirmação de pedido (varejo)' },
              { key: 'notif_order_shipped',   label: 'Pedido enviado — com código de rastreio' },
              { key: 'notif_order_delivered', label: 'Pedido entregue' },
              { key: 'notif_order_cancelled', label: 'Cancelamento de pedido' },
              { key: 'notif_new_customer',    label: 'Novo cadastro de cliente' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
