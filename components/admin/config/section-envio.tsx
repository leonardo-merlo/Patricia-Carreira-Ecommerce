"use client" // formulário controlado

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStoreSettings, type StoreSettings } from '@/lib/actions/settings'
import { SaveRow, Toggle, useSaveState } from './config-parts'

const ALL_CARRIERS = ['Correios (PAC)', 'Correios (SEDEX)', 'Jadlog (.Package)', 'Total Express']

export function SectionEnvio({ settings }: { settings: StoreSettings }) {
  const router = useRouter()
  const { saving, saved, error, run } = useSaveState()

  const [mesmoDoFiscal, setMesmoDoFiscal] = useState(settings.origin_same_as_fiscal)
  const [origem, setOrigem] = useState({
    origin_cep: settings.origin_cep ?? '',
    origin_street: settings.origin_street ?? '',
    origin_number: settings.origin_number ?? '',
    origin_complement: settings.origin_complement ?? '',
    origin_district: settings.origin_district ?? '',
    origin_city: settings.origin_city ?? '',
    origin_state: settings.origin_state ?? '',
    origin_contact_name: settings.origin_contact_name ?? '',
    origin_phone: settings.origin_phone ?? '',
    origin_email: settings.origin_email ?? '',
  })
  const [extraDays, setExtraDays] = useState(String(settings.shipping_extra_days))
  const [threshold, setThreshold] = useState(String(settings.free_shipping_threshold))
  const [carriers, setCarriers] = useState<string[]>(settings.enabled_carriers ?? [])
  const [carrierError, setCarrierError] = useState<string | null>(null)

  const campo = (key: keyof typeof origem) => ({
    value: origem[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setOrigem((prev) => ({ ...prev, [key]: e.target.value })),
  })

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
        origin_same_as_fiscal: mesmoDoFiscal,
        ...origem,
        shipping_extra_days: Number(extraDays) || 1,
        free_shipping_threshold: Number(threshold) || 350,
      }),
    )
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <div className="card" id="card-origem-frete">
        <div className="card-header">
          <h3 className="ttl">De onde o pacote sai</h3>
          <span className="sub">endereço que a transportadora coleta</span>
        </div>
        <div className="card-body">
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14 }}>
            Este endereço decide o frete que o cliente vê no carrinho e o local da coleta.
            Não é o endereço que sai na nota fiscal — esse fica em{' '}
            <a href="/admin/config/fiscal" style={{ color: 'var(--accent)' }}>Fiscal</a>.
          </div>

          <div
            className="row between"
            style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12.5, gap: 12, marginBottom: 14 }}
          >
            <span id="label-origem-igual-fiscal">
              O pacote sai do mesmo endereço da empresa (o fiscal)
            </span>
            <Toggle value={mesmoDoFiscal} onChange={setMesmoDoFiscal} />
          </div>

          <div className="field" style={{ maxWidth: 220, marginBottom: 14 }}>
            <label htmlFor="cfg-cep-origem">CEP de origem</label>
            <input className="input" id="cfg-cep-origem" data-testid="cfg-cep-origem"
              placeholder="00000-000" {...campo('origin_cep')} disabled={mesmoDoFiscal} />
            {mesmoDoFiscal && (
              <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                vem do CEP fiscal enquanto a chave acima estiver ligada
              </span>
            )}
          </div>

          {mesmoDoFiscal ? (
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Com a chave ligada, a origem do frete acompanha o endereço fiscal — um endereço
              só para manter. Desligue quando a loja e a empresa ficarem em lugares diferentes.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 14 }} data-testid="bloco-origem-frete">
              <div className="config-grid-2">
                <div className="field">
                  <label htmlFor="cfg-origem-logradouro">Logradouro</label>
                  <input className="input" id="cfg-origem-logradouro" data-testid="cfg-origem-logradouro"
                    {...campo('origin_street')} />
                </div>
                <div className="field">
                  <label htmlFor="cfg-origem-numero">Número</label>
                  <input className="input" id="cfg-origem-numero" data-testid="cfg-origem-numero"
                    {...campo('origin_number')} />
                </div>
              </div>

              <div className="config-grid-2">
                <div className="field">
                  <label htmlFor="cfg-origem-complemento">Complemento</label>
                  <input className="input" id="cfg-origem-complemento" data-testid="cfg-origem-complemento"
                    {...campo('origin_complement')} />
                </div>
                <div className="field">
                  <label htmlFor="cfg-origem-bairro">Bairro</label>
                  <input className="input" id="cfg-origem-bairro" data-testid="cfg-origem-bairro"
                    {...campo('origin_district')} />
                </div>
              </div>

              <div className="config-grid-2">
                <div className="field">
                  <label htmlFor="cfg-origem-cidade">Cidade</label>
                  <input className="input" id="cfg-origem-cidade" data-testid="cfg-origem-cidade"
                    {...campo('origin_city')} />
                </div>
                <div className="field">
                  <label htmlFor="cfg-origem-uf">Estado (UF)</label>
                  <input className="input" id="cfg-origem-uf" data-testid="cfg-origem-uf"
                    maxLength={2} placeholder="BA" {...campo('origin_state')} />
                </div>
              </div>

              <div className="config-grid-2">
                <div className="field">
                  <label htmlFor="cfg-origem-contato">Nome de quem entrega</label>
                  <input className="input" id="cfg-origem-contato" data-testid="cfg-origem-contato"
                    placeholder="deixe vazio para usar o nome da empresa" {...campo('origin_contact_name')} />
                </div>
                <div className="field">
                  <label htmlFor="cfg-origem-telefone">Telefone de contato</label>
                  <input className="input" id="cfg-origem-telefone" data-testid="cfg-origem-telefone"
                    {...campo('origin_phone')} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="cfg-origem-email">E-mail de contato</label>
                <input className="input" id="cfg-origem-email" type="email" data-testid="cfg-origem-email"
                  {...campo('origin_email')} />
              </div>
            </div>
          )}
        </div>
        <SaveRow saving={saving} saved={saved} onSave={saveAll} id="btn-salvar-origem-frete" />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Melhor Envio</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
              O token é configurado por variável de ambiente (<code>MELHOR_ENVIO_TOKEN</code>).
              A situação real da conexão aparece em{' '}
              <a href="/admin/config/integracoes" style={{ color: 'var(--accent)' }}>Integrações</a>.
            </div>

            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="cfg-prazo-extra">Prazo adicional (dias)</label>
              <input className="input" id="cfg-prazo-extra" type="number" min={0} max={30}
                value={extraDays} onChange={(e) => setExtraDays(e.target.value)} />
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
