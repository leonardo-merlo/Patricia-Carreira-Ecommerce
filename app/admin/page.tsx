import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import {
  getDashboardKPIs,
  getDashboardRecentOrders,
  getDashboardCriticalStock,
} from '@/lib/supabase/admin-queries'

const STATUS_MAP: Record<string, { cls: string; txt: string }> = {
  pending: { cls: 'pendente', txt: 'Pendente' },
  paid: { cls: 'pago', txt: 'Pago' },
  separating: { cls: 'pendente', txt: 'Separando' },
  confirmed: { cls: 'pago', txt: 'Confirmado' },
  in_production: { cls: 'producao', txt: 'Em Produção' },
  shipped: { cls: 'enviado', txt: 'Enviado' },
  delivered: { cls: 'enviado', txt: 'Entregue' },
  cancelled: { cls: 'cancelado', txt: 'Cancelado' },
}

function getStatusDisplay(status: string) {
  return STATUS_MAP[status] ?? { cls: 'neutral', txt: status }
}

function getCategoryThumb(category: string): string {
  if (category === 'bolsas') return 'bag'
  if (category === 'roupas') return 'cloth'
  if (category === 'bazar') return 'acc'
  return 'acc'
}

const sparkPaths = [
  'M2 22 L14 18 L26 20 L38 12 L50 14 L62 8 L78 6',
  'M2 18 L14 20 L26 16 L38 18 L50 12 L62 10 L78 4',
  'M2 8 L14 10 L26 14 L38 12 L50 16 L62 18 L78 22',
  'M2 14 L14 16 L26 12 L38 14 L50 12 L62 16 L78 14',
]

const kpiColors = ['#16a34a', '#c97d60', '#b88516', '#2563eb']

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default async function AdminDashboard() {
  const [kpis, orders, critical] = await Promise.all([
    getDashboardKPIs(),
    getDashboardRecentOrders(7),
    getDashboardCriticalStock(6),
  ])

  const revenueFormatted = formatPrice(kpis.revenue_month)
  const kpiValues = [
    {
      label: 'Pedidos hoje',
      value: String(kpis.orders_today),
      unit: undefined,
      trend: { text: 'pedidos confirmados hoje' },
      dot: kpiColors[0],
    },
    {
      label: 'Receita do mês',
      value: revenueFormatted.replace('R$ ', '').replace('R$ ', ''),
      unit: 'R$',
      trend: { text: 'pedidos pagos no mês' },
      dot: kpiColors[1],
    },
    {
      label: 'Estoque crítico',
      value: String(kpis.low_stock_count),
      unit: undefined,
      trend: { warn: kpis.low_stock_count > 0, text: 'variantes com estoque ≤ 3' },
      dot: kpiColors[2],
    },
    {
      label: 'OPs abertas',
      value: String(kpis.open_ops),
      unit: undefined,
      trend: { text: 'ordens em andamento' },
      dot: kpiColors[3],
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">{getGreeting()}, Henrique 👋</h2>
          <p className="page-sub">Visão geral da operação de hoje</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-nova-venda"><AdminIcon name="plus" /> Nova venda</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpiValues.map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">
              <span className="dot" style={{ background: k.dot }} />
              {k.label}
            </div>
            <div className="kpi-value">
              {k.unit && <span className="unit">{k.unit}</span>}
              {k.value}
            </div>
            <div className="kpi-trend">
              {k.trend.warn ? (
                <span style={{ color: 'var(--yellow)', display: 'flex', gap: 4, alignItems: 'center', fontWeight: 500 }}>
                  <AdminIcon name="alert" size={11} /> {k.trend.text}
                </span>
              ) : (
                <span>{k.trend.text}</span>
              )}
            </div>
            <svg className="kpi-spark" width="80" height="28" viewBox="0 0 80 28" fill="none">
              <path d={sparkPaths[i]} stroke={k.dot} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d={sparkPaths[i] + ' L78 28 L2 28 Z'} fill={k.dot} fillOpacity="0.08" />
            </svg>
          </div>
        ))}
      </div>

      <div className="dash-row">
        <div className="card">
          <div className="card-header">
            <div className="row">
              <h3 className="ttl">Pedidos recentes</h3>
              <span className="sub">Últimos {orders.length > 0 ? orders.length : '—'} pedidos</span>
            </div>
            <button className="linkish">Ver todos →</button>
          </div>
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 78 }}>Data</th>
                    <th>Cliente</th>
                    <th style={{ width: 88 }}>Tipo</th>
                    <th style={{ width: 110 }}>Valor</th>
                    <th style={{ width: 130 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-3)' }}>
                        Nenhum pedido ainda.
                      </td>
                    </tr>
                  ) : orders.map((o) => {
                    const status = getStatusDisplay(o.status)
                    const initials = o.customer_name.split(' ').map((s) => s[0]).slice(0, 2).join('')
                    const isAtacado = o.type === 'Atacado'
                    return (
                      <tr key={o.id}>
                        <td>
                          <div>{o.date}</div>
                          <div className="cust-meta">{o.time}</div>
                        </td>
                        <td>
                          <div className="row" style={{ gap: 8 }}>
                            <div className="thumb" style={{
                              width: 22, height: 22, fontSize: 9,
                              background: isAtacado
                                ? 'linear-gradient(135deg,#d8c89a,#a08956)'
                                : 'linear-gradient(135deg,#c9b6c9,#8b6b8b)',
                              color: '#fff',
                            }}>
                              {initials}
                            </div>
                            <span>{o.customer_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isAtacado ? 'atacado' : 'varejo'}`}>{o.type}</span>
                        </td>
                        <td className="num">{formatPrice(o.total)}</td>
                        <td>
                          <span className={`badge ${status.cls}`}>
                            <span className="dot" />
                            {status.txt}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="row">
              <h3 className="ttl">Estoque crítico</h3>
              <span className="sub">{critical.length} {critical.length === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>
          <div className="card-body flush">
            {critical.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                Nenhum item crítico.
              </div>
            ) : (
              <ul className="activity" style={{ borderTop: 'none' }}>
                {critical.map((c) => {
                  const out = c.current === 0
                  const thumb = getCategoryThumb(c.category)
                  return (
                    <li key={c.id} style={{ alignItems: 'center', padding: '10px 16px' }}>
                      <div className={`thumb ${thumb}`} style={{ width: 30, height: 30 }}>
                        <AdminIcon name={c.category === 'roupas' ? 'tag' : 'bag'} size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </div>
                        <div className="cust-meta" style={{ display: 'flex', gap: 8 }}>
                          <span>Atual: <b style={{ color: out ? 'var(--red)' : 'var(--yellow)' }}>{c.current}</b></span>
                        </div>
                      </div>
                      <span className={`badge ${out ? 'esgotado' : 'warn'}`}>
                        <AdminIcon name={out ? 'xCircle' : 'alert'} size={11} />
                        {out ? 'Esgotado' : 'Baixo'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--gap)' }}>
        <div className="card-header">
          <div className="row">
            <h3 className="ttl">Atividade recente</h3>
            <span className="sub">Últimas ações no sistema</span>
          </div>
        </div>
        <div className="card-body flush">
          <ul className="activity">
            <li>
              <span className="dot green" />
              <div style={{ flex: 1, color: 'var(--text-3)', fontSize: 12.5 }}>
                O histórico de atividades estará disponível em breve.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
