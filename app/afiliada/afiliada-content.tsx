"use client" // image gallery selection + variant selection + add to cart state

import { useState } from 'react'

type Tab = 'resumo' | 'vendas' | 'pagamentos' | 'divulgar'
type PeriodKey = 'fev' | 'mar' | 'abr' | 'mai'
type SaleStatus = 'pago' | 'pendente' | 'processando'
type PayStatus = 'pago' | 'pendente'
type ProductFilter = 'todos' | 'novidades' | 'favoritos'

interface AfiliadaContentProps {
  name: string
  commissionPct: number
  paymentDay: number | null
}

// ── dados por período (mock — conectar ao Supabase quando coupons tiver partner_id) ─
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
  fev: {
    label: 'Fev', labelFull: 'fevereiro/26', prevLabel: 'jan',
    sales: 7, revenue: 1980, commission: 297,
    deltaSales: 2, deltaRevenue: 600,
    weekBars: [2, 2, 1, 2],
  },
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

// ── vendas por mês (mock) ───────────────────────────────────────────────────
const salesByPeriod: Record<PeriodKey, { date: string; product: string; size: string; value: number; status: SaleStatus }[]> = {
  fev: [
    { date: '26 fev', product: 'Vestido Bata Linho', size: 'M', value: 187, status: 'pago' },
    { date: '23 fev', product: 'Bolsa Tiracolo Couro Preto', size: 'Único', value: 298, status: 'pago' },
    { date: '20 fev', product: 'Cinto Macramê', size: 'P', value: 89, status: 'pago' },
    { date: '17 fev', product: 'Bata Algodão Bordado', size: 'G', value: 214, status: 'pago' },
    { date: '14 fev', product: 'Vestido Linho Listrado', size: 'P', value: 255, status: 'pago' },
    { date: '10 fev', product: 'Bolsa Palha Redonda', size: 'Único', value: 340, status: 'pago' },
    { date: '06 fev', product: 'Sandália Macramê Natural', size: '38', value: 165, status: 'pago' },
  ],
  mar: [
    { date: '28 mar', product: 'Bolsa Tiracolo Couro Preto', size: 'Único', value: 298, status: 'pago' },
    { date: '25 mar', product: 'Bata Algodão Bordado', size: 'M', value: 214, status: 'pago' },
    { date: '22 mar', product: 'Vestido Linho Listrado', size: 'P', value: 255, status: 'pago' },
    { date: '18 mar', product: 'Bolsa Palha Redonda', size: 'Único', value: 340, status: 'pago' },
    { date: '15 mar', product: 'Cinto Macramê', size: 'M', value: 89, status: 'pago' },
    { date: '12 mar', product: 'Vestido Bata Linho', size: 'G', value: 187, status: 'pago' },
    { date: '08 mar', product: 'Sandália Macramê Natural', size: '37', value: 165, status: 'pago' },
    { date: '04 mar', product: 'Bolsa Saco Nylon Verde', size: 'Único', value: 268, status: 'pago' },
  ],
  abr: [
    { date: '27 abr', product: 'Bolsa Bucket Couro Caramelo', size: 'Único', value: 445, status: 'pago' },
    { date: '24 abr', product: 'Conjunto Saia + Cropped Linho', size: 'M', value: 385, status: 'pago' },
    { date: '20 abr', product: 'Vestido Linho Midi Off-White', size: 'P', value: 310, status: 'pago' },
    { date: '17 abr', product: 'Bata Linho Bordado', size: 'G', value: 248, status: 'pago' },
    { date: '13 abr', product: 'Bolsa Tiracolo Couro Preto', size: 'Único', value: 298, status: 'pago' },
    { date: '10 abr', product: 'Cinto Trançado', size: 'M', value: 75, status: 'pago' },
    { date: '06 abr', product: 'Sandália Macramê Natural', size: '37', value: 165, status: 'pago' },
    { date: '02 abr', product: 'Bolsa Carteira Mini', size: 'Único', value: 195, status: 'pago' },
  ],
  mai: [
    { date: '28 mai', product: 'Bolsa Tiracolo Couro Preto', size: 'Único', value: 298, status: 'pago' },
    { date: '26 mai', product: 'Vestido Bata Linho', size: 'P', value: 187, status: 'pago' },
    { date: '24 mai', product: 'Bolsa Palha Redonda', size: 'Único', value: 340, status: 'processando' },
    { date: '22 mai', product: 'Cinto Macramê', size: 'M', value: 89, status: 'pago' },
    { date: '20 mai', product: 'Bata Algodão Bordado', size: 'G', value: 214, status: 'pendente' },
    { date: '18 mai', product: 'Bolsa Tiracolo Couro Preto', size: 'Único', value: 298, status: 'pago' },
    { date: '15 mai', product: 'Vestido Linho Listrado', size: 'M', value: 255, status: 'pago' },
    { date: '12 mai', product: 'Sandália Macramê Natural', size: '37', value: 165, status: 'pago' },
  ],
}

const statusLabel: Record<SaleStatus, string> = {
  pago: 'confirmado',
  pendente: 'aguardando pagto.',
  processando: 'processando',
}

// ── histórico de pagamentos (mock) ─────────────────────────────────────────
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

// ── produtos para divulgar (mock) ──────────────────────────────────────────
const products = [
  { id: 'p1', name: 'Bolsa Bucket Couro Caramelo', category: 'bolsas', slug: 'bolsa-bucket-couro-caramelo', price: 445, isNew: true,  thumbBg: 'linear-gradient(135deg,#e8c99a,#c9a87a)' },
  { id: 'p2', name: 'Vestido Linho Midi Off-White', category: 'roupas', slug: 'vestido-linho-midi-off-white', price: 310, isNew: true,  thumbBg: 'linear-gradient(135deg,#ede8e0,#d4cfc5)' },
  { id: 'p3', name: 'Conjunto Saia + Cropped Linho', category: 'roupas', slug: 'conjunto-saia-cropped-linho', price: 385, isNew: true,  thumbBg: 'linear-gradient(135deg,#d6cfc4,#b8b0a4)' },
  { id: 'p4', name: 'Bolsa Palha Trançada Natural', category: 'bolsas', slug: 'bolsa-palha-trancada-natural', price: 380, isNew: false, thumbBg: 'linear-gradient(135deg,#ddd0b8,#c4b090)' },
  { id: 'p5', name: 'Bata Algodão Bordada Cru',     category: 'roupas', slug: 'bata-algodao-bordada-cru',     price: 248, isNew: false, thumbBg: 'linear-gradient(135deg,#f0ece4,#e0d8cc)' },
  { id: 'p6', name: 'Bolsa Tiracolo Couro Preto',   category: 'bolsas', slug: 'bolsa-tiracolo-couro-preto',   price: 298, isNew: false, thumbBg: 'linear-gradient(135deg,#555,#333)' },
]

const catLabel: Record<string, string> = { bolsas: 'Bolsas', roupas: 'Roupas', acessorios: 'Acessórios' }

const fmt = (v: number) => `R$${v.toLocaleString('pt-BR')}`

// ── ícones ─────────────────────────────────────────────────────────────────
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

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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

function IconLink() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────────────────
export function AfiliadaContent({ name, commissionPct, paymentDay }: AfiliadaContentProps) {
  const firstName = name.split(' ')[0]
  const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')

  const [tab, setTab] = useState<Tab>('resumo')
  const [period, setPeriod] = useState<PeriodKey>('mai')
  const [salesPeriod, setSalesPeriod] = useState<PeriodKey>('mai')
  const [productFilter, setProductFilter] = useState<ProductFilter>('todos')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [copiedCoupon, setCopiedCoupon] = useState(false)
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null)

  const p = periodData[period]
  const maxBar = Math.max(...p.weekBars)

  const newCount = products.filter(pr => pr.isNew).length
  const favCount = favorites.size

  const visibleProducts = products.filter(pr => {
    if (productFilter === 'novidades') return pr.isNew
    if (productFilter === 'favoritos') return favorites.has(pr.id)
    return true
  })

  const payDayLabel = paymentDay ? `dia ${paymentDay}` : 'dia 10'

  // Coupon not yet stored in DB (needs partner_id in coupons table)
  const coupon = '—'
  const hasCoupon = false

  const copyCoupon = () => {
    if (!hasCoupon) return
    navigator.clipboard.writeText(coupon).catch(() => {})
    setCopiedCoupon(true)
    setTimeout(() => setCopiedCoupon(false), 2000)
  }

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const copyProductLink = (slug: string, id: string) => {
    const link = `${window.location.origin}/produto/${slug}`
    navigator.clipboard.writeText(link).catch(() => {})
    setCopiedProductId(id)
    setTimeout(() => setCopiedProductId(null), 2000)
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
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{firstName}</span>
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
          <div className="hero-greeting">Olá, {firstName}</div>
          <div className="hero-sub">Aqui estão os seus dados de afiliada — {p.labelFull}</div>
          <div className="cupom-block">
            <span className="cupom-label">Seu cupom</span>
            <span className="cupom-code">{coupon}</span>
            {hasCoupon && (
              <button className="icon-btn" onClick={copyCoupon} title="Copiar código" id="btn-copiar-cupom">
                {copiedCoupon ? <IconCheck /> : <IconCopy />}
              </button>
            )}
            <span className="cupom-discount">{commissionPct}% de desconto para seus clientes</span>
          </div>
          {copiedCoupon && (
            <div style={{ fontSize: 11, color: 'var(--ap-green)', marginTop: 5 }}>Copiado!</div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {([
            ['resumo',     'Resumo'],
            ['vendas',     'Minhas vendas'],
            ['pagamentos', 'Pagamentos'],
            ['divulgar',   'Divulgar'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {label}
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
                {(['fev', 'mar', 'abr', 'mai'] as const).map(pk => (
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
                <div className="metric-delta neu">{commissionPct}% sobre a receita</div>
              </div>
            </div>

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
                <div className="rec-pay-method">via PIX · {payDayLabel} do mês seguinte</div>
              </div>
            </div>

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
          <>
            <div className="period-row" style={{ marginBottom: 14 }}>
              <span className="section-label">Mês</span>
              <div className="period-sel">
                {(['fev', 'mar', 'abr', 'mai'] as const).map(pk => (
                  <button
                    key={pk}
                    className={`period-pill ${salesPeriod === pk ? 'active' : ''}`}
                    onClick={() => setSalesPeriod(pk)}
                  >
                    {periodData[pk].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-header-title">Vendas com seu cupom</span>
                <span style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>
                  {periodData[salesPeriod].sales} vendas em {periodData[salesPeriod].labelFull}
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
                        <th style={{ textAlign: 'right' }}>Comissão</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesByPeriod[salesPeriod].map((s, i) => (
                        <tr key={i}>
                          <td className="num" style={{ color: 'var(--ap-text-3)' }}>{s.date}</td>
                          <td>{s.product}</td>
                          <td style={{ color: 'var(--ap-text-3)' }}>{s.size}</td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.value)}</td>
                          <td className="num" style={{ textAlign: 'right', color: 'var(--ap-accent)', fontWeight: 500 }}>
                            {fmt(Math.round(s.value * commissionPct / 100))}
                          </td>
                          <td>
                            <span className={`badge ${s.status}`}>{statusLabel[s.status]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '1px solid var(--ap-border)' }}>
                        <td colSpan={3} style={{ fontSize: 12, color: 'var(--ap-text-2)', fontWeight: 500 }}>
                          Total do mês ({periodData[salesPeriod].sales} vendas)
                        </td>
                        <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                          {fmt(periodData[salesPeriod].revenue)}
                        </td>
                        <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ap-accent)' }}>
                          {fmt(periodData[salesPeriod].commission)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════ */}
        {/* TAB: PAGAMENTOS               */}
        {/* ══════════════════════════════ */}
        {tab === 'pagamentos' && (
          <>
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">Histórico de pagamentos</span>
                <span style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>
                  {fmt(paymentsHistory.reduce((s, ph) => s + ph.commission, 0))} recebidos no total
                </span>
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

            <div className="card">
              <div className="card-header">
                <span className="card-header-title">Dados para recebimento</span>
                <button className="btn ghost sm">Editar</button>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)', marginBottom: 3, fontWeight: 500 }}>Chave PIX</div>
                    <div style={{ fontWeight: 500, color: 'var(--ap-text-2)' }}>—</div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>Não cadastrada</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)', marginBottom: 3, fontWeight: 500 }}>Dia de pagamento</div>
                    <div style={{ fontWeight: 500 }}>Todo {payDayLabel}</div>
                    <div style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>do mês seguinte</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════ */}
        {/* TAB: DIVULGAR                 */}
        {/* ══════════════════════════════ */}
        {tab === 'divulgar' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ap-text-2)', marginBottom: 14 }}>
                Escolha os produtos que quer divulgar e copie o link com o seu cupom já incluído.
              </div>
              <div className="products-filter">
                <button
                  className={`filter-pill ${productFilter === 'todos' ? 'active' : ''}`}
                  onClick={() => setProductFilter('todos')}
                >
                  Todos ({products.length})
                </button>
                <button
                  className={`filter-pill ${productFilter === 'novidades' ? 'active' : ''}`}
                  onClick={() => setProductFilter('novidades')}
                >
                  Novidades ({newCount})
                </button>
                <button
                  className={`filter-pill ${productFilter === 'favoritos' ? 'active' : ''}`}
                  onClick={() => setProductFilter('favoritos')}
                >
                  Favoritos ({favCount})
                </button>
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                color: 'var(--ap-text-3)', fontSize: 13,
                background: 'var(--ap-bg)', borderRadius: 10,
                border: '1px solid var(--ap-border)',
              }}>
                Nenhum produto favoritado ainda.
                <div style={{ marginTop: 6, fontSize: 11 }}>
                  Clique no coração de um produto para adicioná-lo aqui.
                </div>
              </div>
            ) : (
              <div className="products-grid">
                {visibleProducts.map(pr => {
                  const isFav = favorites.has(pr.id)
                  const isCopied = copiedProductId === pr.id
                  return (
                    <div className="product-card" key={pr.id}>
                      <div className="product-thumb" style={{ background: pr.thumbBg }}>
                        {pr.isNew && <span className="product-new-badge">Novidade</span>}
                      </div>
                      <div className="product-body">
                        <div className="product-cat">{catLabel[pr.category]}</div>
                        <div className="product-name">{pr.name}</div>
                        <div className="product-price">{fmt(pr.price)}</div>
                      </div>
                      <div className="product-actions">
                        <button
                          className={`fav-btn ${isFav ? 'active' : ''}`}
                          onClick={() => toggleFav(pr.id)}
                          title={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                        >
                          <IconHeart filled={isFav} />
                        </button>
                        <button
                          className={`copy-link-btn ${isCopied ? 'copied' : ''}`}
                          onClick={() => copyProductLink(pr.slug, pr.id)}
                        >
                          {isCopied ? <><IconCheck /> Copiado!</> : <><IconLink /> Copiar link</>}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>
    </>
  )
}
