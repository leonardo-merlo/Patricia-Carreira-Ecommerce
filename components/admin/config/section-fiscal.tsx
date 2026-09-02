"use client" // formulário controlado e botão de teste com resultado na tela

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import {
  testarConexaoFocusNfe,
  updateStoreSettings,
  type StoreSettings,
  type ConnectionTestResult,
} from '@/lib/actions/settings'
import { SaveRow, ToggleList, useSaveState } from './config-parts'

export function SectionFiscal({ settings }: { settings: StoreSettings }) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ConnectionTestResult | null>(null)
  const { saving, saved, error, run } = useSaveState()

  const [dados, setDados] = useState({
    cnpj: settings.cnpj ?? '',
    legal_name: settings.legal_name ?? '',
    state_registration: settings.state_registration ?? '',
    cnae: settings.cnae ?? '',
    fiscal_street: settings.fiscal_street ?? '',
    fiscal_number: settings.fiscal_number ?? '',
    fiscal_complement: settings.fiscal_complement ?? '',
    fiscal_district: settings.fiscal_district ?? '',
    fiscal_city: settings.fiscal_city ?? '',
    fiscal_state: settings.fiscal_state ?? '',
    fiscal_zip: settings.fiscal_zip ?? '',
    tax_regime: settings.tax_regime ?? 1,
  })

  // tax_regime é number e sai de um <select>; os demais são texto de <input>.
  type CamposDeTexto = Exclude<keyof typeof dados, 'tax_regime'>
  const campo = (key: CamposDeTexto) => ({
    value: dados[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setDados((prev) => ({ ...prev, [key]: e.target.value })),
  })

  async function testar() {
    setTesting(true)
    setResult(null)
    try {
      setResult(await testarConexaoFocusNfe())
    } catch {
      setResult({ ok: false, environment: '—', detail: 'Não foi possível executar o teste.' })
    }
    setTesting(false)
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <div className="card" id="card-dados-fiscais">
        <div className="card-header">
          <h3 className="ttl">Dados fiscais da empresa</h3>
          <span className="sub">copie do cartão CNPJ</span>
        </div>
        <div className="card-body">
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14 }}>
            Este é o endereço que sai <b>impresso na nota fiscal</b>, e é ele que decide o
            imposto da venda. Não é o endereço de onde o pacote sai — esse fica em{' '}
            <a href="/admin/config/envio" style={{ color: 'var(--accent)' }}>Envio</a>.
            Enquanto faltar algum campo aqui, a nota não é emitida e o pedido mostra qual
            dado está faltando.
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className="config-grid-2">
              <div className="field">
                <label htmlFor="cfg-fiscal-cnpj">CNPJ</label>
                <input className="input" id="cfg-fiscal-cnpj" data-testid="cfg-fiscal-cnpj"
                  placeholder="00.000.000/0001-00" {...campo('cnpj')} />
              </div>
              <div className="field">
                <label htmlFor="cfg-fiscal-razao">Razão social</label>
                <input className="input" id="cfg-fiscal-razao" data-testid="cfg-fiscal-razao"
                  placeholder="como está registrada, não o nome da marca" {...campo('legal_name')} />
              </div>
            </div>

            <div className="config-grid-2">
              <div className="field">
                <label htmlFor="cfg-fiscal-ie">Inscrição Estadual</label>
                <input className="input" id="cfg-fiscal-ie" data-testid="cfg-fiscal-ie"
                  placeholder="número da IE ou ISENTO" {...campo('state_registration')} />
              </div>
              <div className="field">
                <label htmlFor="cfg-fiscal-cnae">CNAE (atividade principal)</label>
                <input className="input" id="cfg-fiscal-cnae" data-testid="cfg-fiscal-cnae"
                  placeholder="0000-0/00" {...campo('cnae')} />
              </div>
            </div>

            <div className="config-grid-2">
              <div className="field">
                <label htmlFor="cfg-fiscal-logradouro">Logradouro</label>
                <input className="input" id="cfg-fiscal-logradouro" data-testid="cfg-fiscal-logradouro"
                  {...campo('fiscal_street')} />
              </div>
              <div className="field">
                <label htmlFor="cfg-fiscal-numero">Número</label>
                <input className="input" id="cfg-fiscal-numero" data-testid="cfg-fiscal-numero"
                  {...campo('fiscal_number')} />
              </div>
            </div>

            <div className="config-grid-2">
              <div className="field">
                <label htmlFor="cfg-fiscal-complemento">Complemento</label>
                <input className="input" id="cfg-fiscal-complemento" data-testid="cfg-fiscal-complemento"
                  {...campo('fiscal_complement')} />
              </div>
              <div className="field">
                <label htmlFor="cfg-fiscal-bairro">Bairro</label>
                <input className="input" id="cfg-fiscal-bairro" data-testid="cfg-fiscal-bairro"
                  {...campo('fiscal_district')} />
              </div>
            </div>

            <div className="config-grid-2">
              <div className="field">
                <label htmlFor="cfg-fiscal-cidade">Cidade</label>
                <input className="input" id="cfg-fiscal-cidade" data-testid="cfg-fiscal-cidade"
                  {...campo('fiscal_city')} />
              </div>
              <div className="field">
                <label htmlFor="cfg-fiscal-uf">Estado (UF)</label>
                <input className="input" id="cfg-fiscal-uf" data-testid="cfg-fiscal-uf"
                  maxLength={2} placeholder="MG" {...campo('fiscal_state')} />
              </div>
            </div>

            <div className="config-grid-2">
              <div className="field">
                <label htmlFor="cfg-fiscal-cep">CEP</label>
                <input className="input" id="cfg-fiscal-cep" data-testid="cfg-fiscal-cep"
                  placeholder="00000-000" {...campo('fiscal_zip')} />
              </div>
              <div className="field">
                <label htmlFor="cfg-fiscal-regime">Regime tributário</label>
                <select className="input" id="cfg-fiscal-regime" data-testid="cfg-fiscal-regime"
                  value={String(dados.tax_regime)}
                  onChange={(e) => setDados((prev) => ({ ...prev, tax_regime: Number(e.target.value) }))}
                >
                  <option value="1">Simples Nacional</option>
                  <option value="2">Simples Nacional — excesso de sublimite</option>
                  <option value="3">Regime normal (Lucro Presumido ou Real)</option>
                </select>
              </div>
            </div>

            {error && <div className="alert alert-error" style={{ fontSize: 12 }}>{error}</div>}
          </div>
        </div>
        <SaveRow
          saving={saving}
          saved={saved}
          id="btn-salvar-dados-fiscais"
          onSave={() => run(() => updateStoreSettings(dados))}
        />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Focus NFe</h3></div>
        <div className="card-body">
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
            O token e o ambiente são configurados por variável de ambiente
            (<code>FOCUS_NFE_TOKEN</code>, <code>FOCUS_NFE_AMBIENTE</code>), na Vercel ou no{' '}
            <code>.env.local</code>. O CNPJ e o endereço do emitente vêm do formulário acima.
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="cust-meta" style={{ maxWidth: 460 }}>
              O teste confere se o token responde e em qual ambiente. Emitir uma nota
              de verdade — mesmo em homologação — exige um pedido real com NCM em cada
              produto, e continua sendo feito pelo botão dentro do pedido.
            </div>
            <button
              className="btn"
              type="button"
              id="btn-testar-focus-nfe"
              data-testid="btn-testar-focus-nfe"
              disabled={testing}
              onClick={testar}
            >
              <AdminIcon name="plug" size={12} />
              {testing ? 'Testando…' : 'Testar conexão'}
            </button>
          </div>

          {result && (
            <div
              className={`alert ${result.ok ? 'alert-success' : 'alert-error'}`}
              data-testid="resultado-teste-nfe"
              style={{ marginTop: 12, fontSize: 12.5 }}
            >
              <b>{result.ok ? 'Conectado' : 'Falhou'}</b> · ambiente {result.environment}
              <div style={{ marginTop: 2 }}>{result.detail}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Emissão automática</h3></div>
        <div className="card-body">
          <ToggleList
            settings={settings}
            items={[
              { key: 'auto_nfe_retail',      label: 'Emitir NF-e automaticamente após pagamento confirmado (varejo)' },
              { key: 'send_danfe_email',     label: 'Enviar DANFE por e-mail ao cliente' },
              { key: 'manual_nfe_wholesale', label: 'Gerar NF-e para pedidos atacado manualmente' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
