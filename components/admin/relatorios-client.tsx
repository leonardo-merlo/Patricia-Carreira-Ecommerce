"use client" // period selector navigates with router.push; charts need client state

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import type { ReportData } from '@/lib/supabase/report-queries'
import { getPrevPeriodLabel, parseCustomPeriod } from '@/lib/supabase/report-queries'

const CUSTOM_OPTION = 'custom'

function getPeriodOptions(): Array<{ value: string; label: string }> {
  const now = new Date()
  const opts: Array<{ value: string; label: string }> = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const raw = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value, label: raw.charAt(0).toUpperCase() + raw.slice(1) })
  }
  opts.push({ value: 'last90', label: 'Últimos 90 dias' })
  opts.push({ value: String(now.getFullYear()), label: `Ano de ${now.getFullYear()}` })
  opts.push({ value: CUSTOM_OPTION, label: 'Escolher datas...' })
  return opts
}

function fmtDelta(pct: number | null, label: string): { txt: string; up: boolean } | null {
  if (pct === null) return null
  const sign = pct >= 0 ? '+' : ''
  return { txt: `${sign}${pct.toFixed(1)}%`, up: pct >= 0 }
}

interface RelatoriosClientProps {
  data: ReportData
  period: string
}

export function RelatoriosClient({ data, period }: RelatoriosClientProps) {
  const router = useRouter()
  const opts = getPeriodOptions()
  const prevLabel = getPrevPeriodLabel(period)

  const { kpis, monthly_revenue, by_category, top_products, by_affiliate, channels, channel_units, client_stats } = data

  // Intervalo personalizado: os campos de data só aparecem quando ele é escolhido.
  const custom = parseCustomPeriod(period)
  const [customDe, setCustomDe] = useState(custom?.de ?? '')
  const [customAte, setCustomAte] = useState(custom?.ate ?? '')
  const [showCustom, setShowCustom] = useState(Boolean(custom))

  function applyCustom(de: string, ate: string) {
    if (!de || !ate) return
    // Datas trocadas dariam um intervalo vazio em silêncio.
    const [inicio, fim] = de <= ate ? [de, ate] : [ate, de]
    router.push(`/admin/relatorios?period=custom:${inicio}:${fim}`)
  }

  const monthlyValues = monthly_revenue.map((m) => m.value)
  const maxV = Math.max(...monthlyValues, 1)

  // Donut chart arcs (SVG stroke-dasharray technique — circumference ≈ 100)
  let acc = 0
  const donutArcs = by_category.map((c) => {
    const dash = c.pct
    const gap = 100 - dash
    const off = 25 - acc
    acc += dash
    return { ...c, dash, gap, off }
  })

  const totalChannels = channels.retail + channels.wholesale
  const retailPct = totalChannels > 0 ? (channels.retail / totalChannels) * 100 : 0
  const wholesalePct = totalChannels > 0 ? (channels.wholesale / totalChannels) * 100 : 0

  const topRevMax = top_products[0]?.rev ?? 1

  const kpiCards = [
    {
      label: 'Receita do período',
      value: formatPrice(kpis.revenue),
      raw: null,
      delta: fmtDelta(kpis.revenue_delta_pct, prevLabel),
      dot: 'var(--accent)',
    },
    {
      label: 'Ticket médio',
      value: formatPrice(kpis.avg_ticket),
      raw: null,
      delta: fmtDelta(kpis.avg_ticket_delta_pct, prevLabel),
      dot: 'var(--blue)',
    },
    {
      label: 'Pedidos pagos',
      value: String(kpis.order_count),
      raw: null,
      delta: fmtDelta(kpis.order_count_delta_pct, prevLabel),
      dot: 'var(--purple)',
    },
    {
      label: 'Peças vendidas',
      value: String(kpis.items_sold),
      raw: null,
      delta: null,
      dot: 'var(--orange)',
    },
    {
      label: 'Clientes ativos',
      value: String(client_stats.retail_unique + client_stats.wholesale_active),
      raw: null,
      delta: null,
      dot: 'var(--green)',
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Relatórios</h2>
          <p className="page-sub">Performance de vendas, produtos e operação · {data.period_label}</p>
        </div>
        <div className="page-actions" style={{ flexWrap: 'wrap' }}>
          <select
            className="select"
            id="filtro-periodo-relatorio"
            style={{ width: 'auto' }}
            value={showCustom ? CUSTOM_OPTION : period}
            onChange={(e) => {
              if (e.target.value === CUSTOM_OPTION) { setShowCustom(true); return }
              setShowCustom(false)
              router.push(`/admin/relatorios?period=${e.target.value}`)
            }}
          >
            {opts.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {showCustom && (
            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <input
                className="input"
                type="date"
                id="relatorio-data-de"
                aria-label="Data inicial"
                style={{ width: 145, flex: '0 0 auto' }}
                value={customDe}
                onChange={(e) => { setCustomDe(e.target.value); applyCustom(e.target.value, customAte) }}
              />
              <span className="cust-meta">até</span>
              <input
                className="input"
                type="date"
                id="relatorio-data-ate"
                aria-label="Data final"
                style={{ width: 145, flex: '0 0 auto' }}
                value={customAte}
                onChange={(e) => { setCustomAte(e.target.value); applyCustom(customDe, e.target.value) }}
              />
            </div>
          )}

          <button className="btn" onClick={() => window.print()}>
            <AdminIcon name="download" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpiCards.map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">
              <span className="dot" style={{ background: k.dot }} />
              {k.label}
            </div>
            <div className="kpi-value">{k.value}</div>
            {k.delta ? (
              <div className="kpi-trend">
                <span className={k.delta.up ? 'up' : 'down'}>
                  <AdminIcon name={k.delta.up ? 'arrowUp' : 'arrowDown'} size={11} /> {k.delta.txt}
                </span>
                <span className="subtle">vs. {prevLabel}</span>
              </div>
            ) : (
              <div className="kpi-trend">
                <span className="subtle">varejo + atacado</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="dash-row" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Bar chart — monthly revenue */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="ttl">Receita mensal</h3>
              <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 2 }}>Últimos 12 meses · valores em R$</div>
            </div>
            <div className="row" style={{ gap: 12, fontSize: 11.5, color: 'var(--text-2)' }}>
              <span className="row" style={{ gap: 4 }}>
                <span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2 }} /> Receita
              </span>
            </div>
          </div>
          <div className="card-body" style={{ padding: '18px 20px 14px' }}>
            <div style={{ position: 'relative', height: 220 }}>
              {[0, 25, 50, 75, 100].map((p, i) => (
                <div key={i} style={{ position: 'absolute', left: 36, right: 0, top: `${p}%`, borderTop: '1px dashed var(--border)' }} />
              ))}
              {[maxV, maxV * 0.75, maxV * 0.5, maxV * 0.25, 0].map((v, i) => (
                <div
                  key={i}
                  style={{ position: 'absolute', left: 0, top: `${i * 25}%`, fontSize: 9.5, color: 'var(--text-3)', transform: 'translateY(-50%)', width: 32, textAlign: 'right' }}
                >
                  {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
                </div>
              ))}
              <div style={{ position: 'absolute', left: 40, right: 4, bottom: 0, top: 0, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {monthly_revenue.map((m, i) => (
                  <div
                    key={i}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${(m.value / maxV) * 100}%`,
                        minHeight: m.value > 0 ? 2 : 0,
                        background: i === monthly_revenue.length - 1 ? 'var(--accent)' : 'var(--accent-soft-2)',
                        borderRadius: '3px 3px 0 0',
                      }}
                    />
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{m.month}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Donut — revenue by category */}
        <div className="card">
          <div className="card-header">
            <h3 className="ttl">Receita por categoria</h3>
            <span style={{ color: 'var(--text-3)', fontSize: 11.5 }}>{data.period_label}</span>
          </div>
          <div className="card-body">
            {by_category.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 12 }}>
                Sem vendas no período
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <svg width="120" height="120" viewBox="0 0 36 36">
                  {donutArcs.map((c, i) => (
                    <circle
                      key={i}
                      r="15.915" cx="18" cy="18"
                      fill="transparent"
                      stroke={c.color}
                      strokeWidth="4.5"
                      strokeDasharray={`${c.dash} ${c.gap}`}
                      strokeDashoffset={c.off}
                    />
                  ))}
                  <text x="18" y="18.5" textAnchor="middle" fontSize="4.5" fontWeight="600" fill="var(--text)">
                    {formatPrice(kpis.revenue).replace('R$ ', 'R$')}
                  </text>
                  <text x="18" y="22.5" textAnchor="middle" fontSize="2.6" fill="var(--text-3)">total</text>
                </svg>
                <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                  {by_category.map((c, i) => (
                    <div key={i}>
                      <div className="row between" style={{ fontSize: 12.5 }}>
                        <span className="row" style={{ gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                          {c.name}
                        </span>
                        <span className="num" style={{ fontWeight: 500 }}>{c.pct}%</span>
                      </div>
                      <div style={{ paddingLeft: 14, color: 'var(--text-3)', fontSize: 11 }}>
                        {formatPrice(c.value)} · {c.units} {c.units === 1 ? 'peça' : 'peças'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dash-row" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Top products */}
        <div className="card">
          <div className="card-header">
            <h3 className="ttl">Produtos mais vendidos</h3>
            <span style={{ color: 'var(--text-3)', fontSize: 11.5 }}>{data.period_label}</span>
          </div>
          {top_products.length === 0 ? (
            <div className="card-body">
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 12 }}>
                Sem vendas no período
              </div>
            </div>
          ) : (
            <div className="card-body flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Produto</th>
                    <th style={{ width: 90 }}>Unidades</th>
                    <th style={{ width: 140 }}>Receita</th>
                    <th style={{ width: 140 }}>Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {top_products.map((p, i) => (
                    <tr key={i}>
                      <td><span style={{ color: 'var(--text-3)', fontSize: 11 }}>{i + 1}</span></td>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <div className="thumb bag" style={{ width: 24, height: 24 }}>
                            <AdminIcon name="bag" size={12} />
                          </div>
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="num">{p.units}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{formatPrice(p.rev)}</td>
                      <td>
                        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(p.rev / topRevMax) * 100}%`, background: 'var(--accent)' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="card">
          <div className="card-header"><h3 className="ttl">Canais de venda</h3></div>
          <div className="card-body" style={{ display: 'grid', gap: 14 }}>
            {[
              { label: 'E-commerce (Varejo)', val: channels.retail, units: channel_units.retail, pct: retailPct, color: 'var(--accent)' },
              { label: 'Atacado (Manual)', val: channels.wholesale, units: channel_units.wholesale, pct: wholesalePct, color: 'var(--purple)' },
            ].map((c, i) => (
              <div key={i}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.label}</span>
                  <span className="num" style={{ fontSize: 12.5 }}>{formatPrice(c.val)}</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.color }} />
                </div>
                <div style={{ marginTop: 3, color: 'var(--text-3)', fontSize: 11 }}>
                  {c.pct.toFixed(1)}% da receita · {c.units} {c.units === 1 ? 'peça' : 'peças'}
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'grid', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
              <div className="row between">
                <span>Clientes varejo únicos</span>
                <span className="num" style={{ color: 'var(--text)', fontWeight: 500 }}>{client_stats.retail_unique}</span>
              </div>
              <div className="row between">
                <span>Atacadistas ativos</span>
                <span className="num" style={{ color: 'var(--text)', fontWeight: 500 }}>{client_stats.wholesale_active}</span>
              </div>
              <div className="row between">
                <span>Pedidos no período</span>
                <span className="num" style={{ color: 'var(--text)', fontWeight: 500 }}>{kpis.order_count}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receita por afiliada */}
      <div className="card" style={{ marginTop: 'var(--gap)' }}>
        <div className="card-header">
          <div>
            <h3 className="ttl">Receita por afiliada</h3>
            <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 2 }}>
              Vendas atribuídas pelo cupom da afiliada · {data.period_label}
            </div>
          </div>
        </div>
        {by_affiliate.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 12 }}>
            Nenhuma venda com cupom de afiliada neste período.
          </div>
        ) : (
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Afiliada</th>
                    <th style={{ width: 130 }}>Cupom</th>
                    <th style={{ width: 90 }}>Pedidos</th>
                    <th style={{ width: 130 }}>Receita</th>
                    <th style={{ width: 100 }}>Comissão</th>
                    <th style={{ width: 130 }}>A pagar (estim.)</th>
                  </tr>
                </thead>
                <tbody>
                  {by_affiliate.map((a) => (
                    <tr key={`${a.name}-${a.coupon_code ?? ''}`}>
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td>
                        {a.coupon_code ? (
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'var(--text-2)' }}>
                            {a.coupon_code}
                          </span>
                        ) : <span className="cust-meta">—</span>}
                      </td>
                      <td className="num">{a.orders}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{formatPrice(a.revenue)}</td>
                      <td className="num subtle">{a.commission_pct != null ? `${a.commission_pct}%` : '—'}</td>
                      <td className="num">{a.commission_pct != null ? formatPrice(a.estimated_commission) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cust-meta" style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
              A comissão aqui é estimativa sobre a receita do período. O valor que
              será realmente pago vive em{' '}
              <a href="/admin/financeiro" style={{ color: 'var(--accent)' }}>Financeiro</a>, como conta a pagar.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
