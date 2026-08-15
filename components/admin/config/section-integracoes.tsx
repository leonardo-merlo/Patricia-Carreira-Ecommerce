import Link from 'next/link'
import { AdminIcon } from '@/components/admin/admin-icon'
import type { ServiceCheck } from '@/lib/server/diagnostics'

// Server component: os dados já vêm prontos da página, não há estado aqui.

type IntegrationIcon = 'creditCard' | 'truck' | 'fileText' | 'mail' | 'plug' | 'mapPin'

const INTEGRATIONS: Array<{
  name: string
  desc: string
  icon: IntegrationIcon
  /** Nome como o diagnóstico devolve; ausente = não há checagem automática. */
  checkName?: string
  staticNote?: string
}> = [
  { name: 'Mercado Pago', desc: 'Gateway de pagamentos',        icon: 'creditCard', checkName: 'Mercado Pago' },
  { name: 'Melhor Envio', desc: 'Cálculo de frete e etiquetas', icon: 'truck',      checkName: 'Melhor Envio' },
  { name: 'Focus NFe',    desc: 'Emissão de NF-e',              icon: 'fileText',   checkName: 'Focus NFe' },
  { name: 'Resend',       desc: 'E-mails transacionais',        icon: 'mail',       checkName: 'Resend' },
  { name: 'OpenClaw',     desc: 'Automação via Telegram',       icon: 'plug',       staticNote: 'Fase 7 — ainda não configurado' },
  { name: 'ViaCEP',       desc: 'Preenchimento de endereços',   icon: 'mapPin',     staticNote: 'API pública, sem credencial' },
]

export function SectionIntegracoes({ services }: { services: ServiceCheck[] }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
        O estado abaixo vem de uma chamada real a cada serviço, feita agora. Antes
        esta tela dizia &quot;Conectado&quot; sempre, mesmo com o token vencido.
      </div>

      <div className="config-grid-2">
        {INTEGRATIONS.map((intg) => {
          const check = intg.checkName ? services.find((s) => s.service === intg.checkName) : undefined

          return (
            <div className="card" key={intg.name} style={{ padding: 0 }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div className="thumb" style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-2)', flexShrink: 0 }}>
                  <AdminIcon name={intg.icon} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{intg.name}</span>
                    {check ? (
                      <span className={`badge ${check.ok ? 'pago' : 'cancelado'}`} style={{ fontSize: 10.5 }}>
                        <span className="dot" />{check.ok ? 'Conectado' : 'Com erro'}
                      </span>
                    ) : (
                      <span className="badge neutral" style={{ fontSize: 10.5 }}>Sem checagem</span>
                    )}
                  </div>
                  <div className="cust-meta" style={{ marginTop: 2 }}>{intg.desc}</div>
                  <div className="cust-meta tiny" style={{ marginTop: 6, lineHeight: 1.5 }}>
                    {check ? <>Ambiente {check.environment} · {check.detail}</> : intg.staticNote}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="cust-meta">
        Chaves, URLs de webhook e dados do remetente ficam em{' '}
        <Link href="/admin/diagnostico" style={{ color: 'var(--accent)' }}>Diagnóstico</Link>.
      </div>
    </div>
  )
}
