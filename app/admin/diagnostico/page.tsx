import { Fragment } from 'react'
import { runDiagnostics } from '@/lib/server/diagnostics'
import { AdminIcon } from '@/components/admin/admin-icon'
import { WebhookUrlRow } from '@/components/admin/webhook-url-row'

// Chama as APIs dos parceiros a cada visita — nunca pode ser cacheada nem
// pré-renderizada no build, onde as variáveis de ambiente não existem.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Diagnóstico das integrações — Patrícia Carreira',
}

export default async function DiagnosticoPage() {
  const diag = await runDiagnostics()
  const tudoOk =
    diag.missingRequired.length === 0 &&
    diag.services.every((s) => s.ok) &&
    diag.sender.every((f) => f.ok) &&
    diag.fiscal.every((f) => f.ok) &&
    diag.appUrlIsPublic

  return (
    <div className="page" id="page-diagnostico">
      <div className="page-header">
        <div>
          <h1 className="page-title">Diagnóstico das integrações</h1>
          <p className="page-sub">
            Estado de Mercado Pago, Melhor Envio, Focus NFe e Resend neste ambiente.
            Esta página não mostra o valor de nenhuma credencial.
          </p>
        </div>
      </div>

      <div
        className="card"
        id="diagnostico-resumo"
        data-testid="diagnostico-resumo"
        data-status={tudoOk ? 'ok' : 'pendente'}
        style={{ marginBottom: 16 }}
      >
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AdminIcon name={tudoOk ? 'checkCircle' : 'alertCircle'} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {tudoOk
                ? 'Tudo configurado — o fluxo de checkout está pronto para rodar ponta a ponta.'
                : 'Falta configuração para o fluxo rodar ponta a ponta.'}
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginTop: 2 }}>
              URL da aplicação: <strong>{diag.appUrl ?? 'não definida'}</strong>
              {!diag.appUrlIsPublic && ' — em localhost o Mercado Pago não envia notification_url, e nenhum webhook chega.'}
              {diag.missingRequired.length > 0 && (
                <> · Faltando: <strong>{diag.missingRequired.join(', ')}</strong></>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card" id="diagnostico-servicos" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="ttl">Serviços</h2>
          <span className="sub">resposta real da API de cada parceiro, agora</span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl" data-testid="tabela-servicos">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Ambiente</th>
                  <th>Detalhe</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {diag.services.map((s) => (
                  <tr key={s.service} data-testid="linha-servico" data-service={s.service}>
                    <td style={{ fontWeight: 600 }}>{s.service}</td>
                    <td>
                      <span className={`badge ${s.environment.includes('PRODUÇÃO') ? 'alert' : 'neutral'}`}>
                        {s.environment}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{s.detail}</td>
                    <td>
                      <span className={`badge ${s.ok ? 'ok' : 'alert'}`}>{s.ok ? 'respondendo' : 'com problema'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" id="diagnostico-emitente" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="ttl">Emitente da NF-e</h2>
          <span className="sub">
            endereço fiscal da empresa — o que sai impresso na nota e decide o CFOP
          </span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl" data-testid="tabela-emitente">
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Valor</th>
                  <th>Exigência</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {diag.fiscal.map((f) => (
                  <tr key={f.label} data-testid="linha-emitente" data-campo={f.label}>
                    <td style={{ fontWeight: 600 }}>{f.label}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}>{f.value}</td>
                    <td style={{ color: 'var(--text-2)' }}>{f.note}</td>
                    <td>
                      <span className={`badge ${f.ok ? 'ok' : 'alert'}`}>{f.ok ? 'válido' : 'pendente'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" id="diagnostico-remetente" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="ttl">Remetente do frete</h2>
          <span className="sub">
            de onde a mercadoria sai — é outro endereço, e é o que o Melhor Envio coleta
          </span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl" data-testid="tabela-remetente">
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Valor</th>
                  <th>Exigência</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {diag.sender.map((f) => (
                  <tr key={f.label} data-testid="linha-remetente" data-campo={f.label}>
                    <td style={{ fontWeight: 600 }}>{f.label}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}>{f.value}</td>
                    <td style={{ color: 'var(--text-2)' }}>{f.note}</td>
                    <td>
                      <span className={`badge ${f.ok ? 'ok' : 'alert'}`}>{f.ok ? 'válido' : 'inválido'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" id="diagnostico-webhooks" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="ttl">URLs de webhook</h2>
          <span className="sub">cadastre estas URLs no painel de cada parceiro</span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl" data-testid="tabela-webhooks">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>URL e onde cadastrar</th>
                  <th>Estado</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {diag.webhooks.map((w, i) => (
                  <WebhookUrlRow key={w.service} webhook={w} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" id="diagnostico-variaveis">
        <div className="card-header">
          <h2 className="ttl">Variáveis de ambiente</h2>
          <span className="sub">presença apenas — nenhum valor é lido para a tela</span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl" data-testid="tabela-variaveis">
              <thead>
                <tr>
                  <th>Variável</th>
                  <th>Para que serve</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {diag.groups.map((group) => (
                  <Fragment key={group.title}>
                    <tr>
                      <td
                        colSpan={3}
                        style={{ fontWeight: 600, background: 'var(--sand)', textAlign: 'left' }}
                      >
                        {group.title}
                      </td>
                    </tr>
                    {group.vars.map((v) => (
                      <tr key={v.name} data-testid="linha-variavel" data-var={v.name}>
                        <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}>{v.name}</td>
                        <td style={{ color: 'var(--text-2)' }}>{v.hint}</td>
                        <td>
                          <span
                            className={`badge ${v.present ? 'ok' : v.required ? 'alert' : 'neutral'}`}
                          >
                            {v.present ? 'definida' : v.required ? 'faltando' : 'opcional'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
