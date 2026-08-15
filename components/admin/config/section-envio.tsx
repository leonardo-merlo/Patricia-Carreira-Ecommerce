"use client" // formulário controlado

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStoreSettings, type StoreSettings } from '@/lib/actions/settings'
import { SaveRow, Toggle, useSaveState } from './config-parts'

const ALL_CARRIERS = ['Correios (PAC)', 'Correios (SEDEX)', 'Jadlog (.Package)', 'Total Express']

export function SectionEnvio({ settings }: { settings: StoreSettings }) {
  const router = useRouter()
  const { saving, saved, error, run } = useSaveState()

  const [originCep, setOriginCep] = useState(settings.origin_cep ?? '')
  const [extraDays, setExtraDays] = useState(String(settings.shipping_extra_days))
  const [threshold, setThreshold] = useState(String(settings.free_shipping_threshold))
  const [carriers, setCarriers] = useState<string[]>(settings.enabled_carriers ?? [])
  const [carrierError, setCarrierError] = useState<string | null>(null)

  async function toggleCarrier(carrier: string, enabled: boolean) {
    const next = enabled ? [...carriers, carrier] : carriers.filter((c) => c !== carrier)
    setCarriers(next)
    setCarrierError(null)

    const res = await updateStoreSettings({ enabled_carriers: next })
    if (!res.ok) {
      setCarriers(carriers)
      setCarrierError(res.error ?? 'Não foi possível salvar.')
      return
    }
    router.refresh()
  }

  function saveAll() {
    return run(() =>
      updateStoreSettings({
        origin_cep: originCep,
        shipping_extra_days: Number(extraDays) || 1,
        free_shipping_threshold: Number(threshold) || 350,
      }),
    )
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Melhor Envio</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
              O token é configurado por variável de ambiente (<code>MELHOR_ENVIO_TOKEN</code>).
              A situação real da conexão aparece em{' '}
              <a href="/admin/config/integracoes" style={{ color: 'var(--accent)' }}>Integrações</a>.
            </div>

            <div className="config-grid-2">
              <div className="field">
                <label htmlFor="cfg-cep-origem">CEP de origem</label>
                <input className="input" id="cfg-cep-origem" value={originCep}
                  onChange={(e) => setOriginCep(e.target.value)} placeholder="00000-000" />
              </div>
              <div className="field">
                <label htmlFor="cfg-prazo-extra">Prazo adicional (dias)</label>
                <input className="input" id="cfg-prazo-extra" type="number" min={0} max={30}
                  value={extraDays} onChange={(e) => setExtraDays(e.target.value)} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Transportadoras habilitadas</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {ALL_CARRIERS.map((carrier) => (
                  <div key={carrier} className="row between"
                    style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12.5, gap: 12 }}>
                    <span>{carrier}</span>
                    <Toggle value={carriers.includes(carrier)} onChange={(v) => toggleCarrier(carrier, v)} />
                  </div>
                ))}
              </div>
              {carrierError && <div className="alert alert-error" style={{ fontSize: 12, marginTop: 8 }}>{carrierError}</div>}
            </div>

            {error && <div className="alert alert-error" style={{ fontSize: 12 }}>{error}</div>}
          </div>
        </div>
        <SaveRow saving={saving} saved={saved} onSave={saveAll} id="btn-salvar-envio" />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Frete grátis</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="cfg-frete-gratis">Valor mínimo do pedido (R$)</label>
              <input className="input" id="cfg-frete-gratis" type="number" min={0}
                value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Aplicado automaticamente no checkout, na transportadora mais barata.
            </p>
          </div>
        </div>
        <SaveRow saving={saving} saved={saved} onSave={saveAll} />
      </div>
    </div>
  )
}
