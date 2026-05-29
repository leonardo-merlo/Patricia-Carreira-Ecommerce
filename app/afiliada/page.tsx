"use client"

import { useState } from 'react'

type Tab = 'resumo' | 'vendas' | 'pagamentos'
type PeriodKey = 'mar' | 'abr' | 'mai'

const afiliada = {
  name: 'Ana Paula Ribeiro',
  firstName: 'Ana Paula',
  initials: 'AP',
  coupon: 'ANAPAULA15',
  commissionPct: 15,
  pixKey: '012.345.678-90',
  pixType: 'CPF',
}

const periodData: Record<PeriodKey, {
  label: string
  labelFull: string
  prevLabel: string
  sales: number
  revenue: number
  commission: number
  deltaSales: number
  deltaRevenue: number
  weekBars: [number, number, number, number]
}> = {
  mar: {
    label: 'Mar', labelFull: 'março/26', prevLabel: 'fev',
    sales: 11, revenue: 3180, commission: 477,
    deltaSales: 4, deltaRevenue: 1200,
    weekBars: [3, 3, 2, 3],
  },
  abr: {
    label: 'Abr', labelFull: 'abril/26', prevLabel: 'mar',
    sales: 9, revenue: 2820, commission: 423,
    deltaSales: -2, deltaRevenue: -360,
    weekBars: [2, 2, 3, 2],
  },
  mai: {
    label: 'Mai', labelFull: 'maio/26', prevLabel: 'abr',
    sales: 12, revenue: 3640, commission: 546,
    deltaSales: 3, deltaRevenue: 820,
    weekBars: [2, 4, 3, 3],
  },
}

type SaleStatus = 'pago' | 'pendente' | 'processando'

const salesItems: { date: string; product: string; size: string; value: number; status: SaleStatus }[] = [
  { date: '28 mai', product: 'Bolsa Tiracolo Couro Preto', size: 'Único', value: 298, status: 'pago' },
  { date: '26 mai', product: 'Vestido Bata Linho', size: 'P', value: 187, status: 'pago' },
  { date: '24 mai', product: 'Bolsa Palha Redonda', size: 'Único', value: 340, status: 'processando' },
  { date: '22 mai', product: 'Cinto Macramê', size: 'M', value: 89, status: 'pago' },
  { date: '20 mai', product: 'Bata Algodão Bordado', size: 'G', value: 214, status: 'pendente' },
  { date: '18 mai', product: 'Bolsa Tiracolo Couro Preto', size: 'Único', value: 298, status: 'pago' },
  { date: '15 mai', product: 'Vestido Linho Listrado', size: 'M', value: 255, status: 'pago' },
  { date: '12 mai', product: 'Sandália Macramê Natural', size: '37', value: 165, status: 'pago' },
]

const statusLabel: Record<SaleStatus, string> = {
  pago: 'confirmado',
  pendente: 'aguardando pagto.',
  processando: 'processando',
}

type PayStatus = 'pago' | 'pendente'

const paymentsHistory: { month: string; sales: number; revenue: number; commission: number; payDate: string; status: PayStatus }[] = [
  { month: 'Maio/26',      sales: 12, revenue: 3640, commission: 546, payDate: '10 jun/26', status: 'pendente' },
  { month: 'Abril/26',     sales: 9,  revenue: 2820, commission: 423, payDate: '10 mai/26', status: 'pago' },
  { month: 'Março/26',     sales: 11, revenue: 3180, commission: 477, payDate: '10 abr/26', status: 'pago' },
  { month: 'Fevereiro/26', sales: 7,  revenue: 1980, commission: 297, payDate: '10 mar/26', status: 'pago' },
]

const timeline: { value: string; status: PayStatus; ref: string; dotYellow?: boolean }[] = [
  { value: 'R$ 546', status: 'pendente', ref: 'Ref. mai/26 · vence 10 jun', dotYellow: true },
  { value: 'R$ 423', status: 'pago',     ref: 'Ref. abr/26 · pago em 10 mai' },
  { value: 'R$ 477', status: 'pago',     ref: 'Ref. mar/26 · pago em 10 abr' },
  { value: 'R$ 297', status: 'pago',     ref: 'Ref. fev/26 · pago em 10 mar' },
]

const fmt = (v: number) => `R$${v.toLocaleString('pt-BR')}`

function IconCopy() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

export default function AfiliadaPage() {
  const [tab, setTab] = useState<Tab>('resumo')
  const [period, setPeriod] = useState<PeriodKey>('mai')
  const [copied, setCopied] = useState(false)

  const p = periodData[period]
  const maxBar = Math.max(...p.weekBars)

  const copyCode = () => {
    navigator.clipboard.writeText(afiliada.coupon).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbar-brand">
          Patrícia Carreira <span>/ área da afiliada</span>
        </div>
        <div className="topbar-right">
          <div className="user-chip">
            <div className="user-avatar">{afiliada.initials}</div>
            <span className="user-name">{afiliada.firstName}</span>
          </div>
          <button
            className="btn ghost sm"
            style={{ border: 'none', color: 'var(--ap-text-3)', padding: '4px 8px' }}
          >
            <IconLogout />
            Sair
          </button>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="page">

        {/* Hero */}
        <div className="hero">
          <div className="hero-greeting">Olá, {afiliada.firstName}</div>
          <div className="hero-sub">Aqui estão os seus dados de afiliada — {p.labelFull}</div>
          <div className="cupom-block">
            <span className="cupom-label">Seu cupom</span>
            <span className="cupom-code">{afiliada.coupon}</span>
            <button className="icon-btn" onClick={copyCode} title="Copiar código" id="btn-copiar-cupom">
              {copied ? <IconCheck /> : <IconCopy />}
            </button>
            <span className="cupom-discount">{afiliada.commissionPct}% de desconto para seus clientes</span>
          </div>
          {copied && (
            <div style={{ fontSize: 11, color: 'var(--ap-green)', marginTop: 5 }}>Copiado!</div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {(['resumo', 'vendas', 'pagamentos'] as const).map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'resumo' ? 'Resumo' : t === 'vendas' ? 'Minhas vendas' : 'Pagamentos'}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════ */}
        {/* TAB: RESUMO                   */}
        {/* ══════════════════════════════ */}
        {tab === 'resumo' && (
          <>
            <div className="period-row">
              <span className="section-label">Mês de referência</span>
              <div className="period-sel">
                {(['mar', 'abr', 'mai'] as const).map(pk => (
                  <button
                    key={pk}
                    className={`period-pill ${period === pk ? 'active' : ''}`}
                    onClick={() => setPeriod(pk)}
                  >
                    {periodData[pk].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Métricas */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Vendas no mês</div>
                <div className="metric-value num">{p.sales}</div>
                <div className={`metric-delta ${p.deltaSales >= 0 ? 'up' : 'down'}`}>
                  {p.deltaSales >= 0 ? '↑' : '↓'} {Math.abs(p.deltaSales)} vs. {p.prevLabel}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Receita gerada</div>
                <div className="metric-value num" style={{ fontSize: 19 }}>{fmt(p.revenue)}</div>
                <div className={`metric-delta ${p.deltaRevenue >= 0 ? 'up' : 'down'}`}>
                  {p.deltaRevenue >= 0 ? '↑' : '↓'} {fmt(Math.abs(p.deltaRevenue))} vs. {p.prevLabel}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Comissão do mês</div>
                <div className="metric-value num" style={{ fontSize: 19, color: 'var(--ap-accent)' }}>
                  {fmt(p.commission)}
                </div>
                <div className="metric-delta neu">{afiliada.commissionPct}% sobre a receita</div>
              </div>
            </div>

            {/* A receber */}
            <div className="receber-card">
              <div>
                <div className="rec-label">total a receber</div>
                <div className="rec-value">R$ 546</div>
                <div className="rec-status">
                  <div className="status-dot yellow" />
                  <span className="rec-status-text">Pagamento em processamento</span>
                </div>
              </div>
              <div className="rec-right">
                <div className="rec-pay-label">previsão de pagamento</div>
                <div className="rec-pay-date">10 jun, 2026</div>
                <div className="rec-pay-method">via PIX · chave CPF</div>
              </div>
            </div>

            {/* Barras por semana + Timeline de pagamentos */}
            <div className="two-cols">
              <div className="card">
                <div className="card-header">
                  <span className="card-header-title">Vendas por semana</span>
                  <span style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>{p.labelFull}</span>
                </div>
                <div className="card-body">
                  {p.weekBars.map((count, i) => (
                    <div className="bar-row" key={i}>
                      <span className="bar-label">S{i + 1}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(count / maxBar) * 100}%` }} />
                      </div>
                      <span className="bar-count num">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-header-title">Seus pagamentos</span>
                </div>
                <div className="card-body">
                  {timeline.map((item, i) => (
                    <div className="tl-item" key={i}>
                      <div className="tl-left">
                        <div
                          className={`tl-dot ${!item.dotYellow && i > 0 ? 'gray' : ''}`}
                          style={item.dotYellow ? { background: '#fac775' } : undefined}
                        />
                        <div className="tl-line" />
                      </div>
                      <div>
                        <div className="tl-title">
                          {item.value}
                          <span className={`badge ${item.status}`}>{item.status}</span>
                        </div>
                        <div className="tl-meta">{item.ref}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════ */}
        {/* TAB: VENDAS                   */}
        {/* ══════════════════════════════ */}
        {tab === 'vendas' && (
          <div className="card">
            <div className="card-header">
              <span className="card-header-title">Vendas realizadas com seu cupom</span>
              <span style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>
                {periodData.mai.sales} vendas em mai/26
              </span>
            </div>
            <div className="card-body flush">
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Produto</th>
                      <th>Tamanho</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesItems.map((s, i) => (
                      <tr key={i}>
                        <td className="num" style={{ color: 'var(--ap-text-3)' }}>{s.date}</td>
                        <td>{s.product}</td>
                        <td style={{ color: 'var(--ap-text-3)' }}>{s.size}</td>
                        <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.value)}</td>
                        <td>
                          <span className={`badge ${s.status}`}>{statusLabel[s.status]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ */}
        {/* TAB: PAGAMENTOS               */}
        {/* ══════════════════════════════ */}
        {tab === 'pagamentos' && (
          <>
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">Histórico de pagamentos</span>
              </div>
              <div className="card-body flush">
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Mês ref.</th>
                        <th style={{ textAlign: 'right' }}>Vendas</th>
                        <th style={{ textAlign: 'right' }}>Receita gerada</th>
                        <th style={{ textAlign: 'right' }}>Sua comissão</th>
                        <th>Pagamento</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsHistory.map((ph, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{ph.month}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{ph.sales}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{fmt(ph.revenue)}</td>
                          <td
                            className="num"
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: ph.status === 'pendente' ? 'var(--ap-accent)' : undefined,
                            }}
                          >
                            {fmt(ph.commission)}
                          </td>
                          <td className="num" style={{ color: 'var(--ap-text-3)' }}>{ph.payDate}</td>
                          <td>
                            <span className={`badge ${ph.status}`}>{ph.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Dados PIX */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">Dados para recebimento</span>
                <button className="btn ghost sm">Editar</button>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)', marginBottom: 3, fontWeight: 500 }}>
                      Chave PIX
                    </div>
                    <div style={{ fontWeight: 500 }}>{afiliada.pixKey}</div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>Tipo: {afiliada.pixType}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)', marginBottom: 3, fontWeight: 500 }}>
                      Dia de pagamento
                    </div>
                    <div style={{ fontWeight: 500 }}>Todo dia 10</div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>do mês seguinte</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  )
}
