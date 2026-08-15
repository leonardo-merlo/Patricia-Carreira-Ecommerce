"use client" // formulário controlado

import { useState } from 'react'
import { updateStoreSettings, type StoreSettings } from '@/lib/actions/settings'
import { SaveRow, useSaveState } from './config-parts'

const ACCOUNT_TYPES = ['Conta corrente', 'Conta poupança', 'Conta pagamento']

export function SectionPagamentos({ settings }: { settings: StoreSettings }) {
  const { saving, saved, error, run } = useSaveState()
  const [form, setForm] = useState({
    bank_name: settings.bank_name ?? '',
    bank_account_type: settings.bank_account_type ?? ACCOUNT_TYPES[0],
    bank_agency: settings.bank_agency ?? '',
    bank_account: settings.bank_account ?? '',
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Mercado Pago</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
              As chaves de API são configuradas por variável de ambiente
              (<code>MERCADOPAGO_ACCESS_TOKEN</code> e <code>NEXT_PUBLIC_MP_PUBLIC_KEY</code>)
              e não ficam no banco. Para conferir se o token responde, veja{' '}
              <a href="/admin/config/integracoes" style={{ color: 'var(--accent)' }}>Integrações</a>.
            </div>
            <div className="config-grid-3">
              {[
                { label: 'PIX', value: '0,99%' },
                { label: 'Cartão crédito', value: '4,99%' },
                { label: 'Parcelamento máx.', value: '6x' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
                  <div className="cust-meta" style={{ fontSize: 11 }}>{label}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Conta bancária</h3></div>
        <div className="card-body">
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
            O repasse é gerenciado no painel do Mercado Pago. Estes campos são
            registro interno — agora gravados de verdade.
          </div>
          <div className="config-grid-2">
            <div className="field">
              <label htmlFor="cfg-banco">Banco</label>
              <input className="input" id="cfg-banco" placeholder="Nubank" value={form.bank_name} onChange={set('bank_name')} />
            </div>
            <div className="field">
              <label htmlFor="cfg-tipo-conta">Tipo de conta</label>
              <select className="select" id="cfg-tipo-conta" value={form.bank_account_type} onChange={set('bank_account_type')}>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cfg-agencia">Agência</label>
              <input className="input" id="cfg-agencia" placeholder="0001" value={form.bank_agency} onChange={set('bank_agency')} />
            </div>
            <div className="field">
              <label htmlFor="cfg-conta">Número da conta</label>
              <input className="input" id="cfg-conta" placeholder="12345-6" value={form.bank_account} onChange={set('bank_account')} />
            </div>
          </div>
          {error && <div className="alert alert-error" style={{ fontSize: 12, marginTop: 10 }}>{error}</div>}
        </div>
        <SaveRow
          saving={saving}
          saved={saved}
          id="btn-salvar-banco"
          onSave={() => run(() => updateStoreSettings(form))}
        />
      </div>
    </div>
  )
}
