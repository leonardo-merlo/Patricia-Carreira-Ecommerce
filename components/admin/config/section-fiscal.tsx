"use client" // botão de teste com resultado na tela

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import {
  testarConexaoFocusNfe,
  type StoreSettings,
  type ConnectionTestResult,
} from '@/lib/actions/settings'
import { ToggleList } from './config-parts'

export function SectionFiscal({ settings }: { settings: StoreSettings }) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ConnectionTestResult | null>(null)

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
      <div className="card">
        <div className="card-header"><h3 className="ttl">Focus NFe</h3></div>
        <div className="card-body">
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
            Token, CNPJ, ambiente e regime tributário são configurados por variável de ambiente
            (<code>FOCUS_NFE_TOKEN</code>, <code>STORE_CNPJ</code>, <code>FOCUSNFE_HOMOLOGACAO</code>,
            {' '}<code>STORE_REGIME</code>), na Vercel ou no <code>.env.local</code>.
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
