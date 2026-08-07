"use client" // image gallery selection + variant selection + add to cart state

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MonthStats } from '@/lib/actions/partners'
import type { Product } from '@/lib/types'

type Tab = 'resumo' | 'vendas' | 'pagamentos' | 'divulgar'
type ProductFilter = 'todos' | 'favoritos'

interface AfiliadaContentProps {
  name: string
  commissionPct: number
  paymentDay: number | null
  couponCode: string | null
  orderHistory: MonthStats[]
  promoProducts: Product[]
}

const catLabel: Record<string, string> = { bolsas: 'Bolsas', roupas: 'Roupas', acessorios: 'Acessórios', bazar: 'Bazar' }

const statusLabel: Record<string, string> = {
  pago: 'confirmado',
  pendente: 'aguardando pagto.',
  processando: 'processando',
}

const PT_MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function getPayDate(monthKey: string, paymentDay: number | null): string {
  const [yearStr, monthStr] = monthKey.split('-')
  const month = parseInt(monthStr) - 1
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear  = month === 11 ? parseInt(yearStr) + 1 : parseInt(yearStr)
  const day = paymentDay ?? 10
  return `${day} ${PT_MONTHS_SHORT[nextMonth]}/${String(nextYear).slice(2)}`
}

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
export function AfiliadaContent({ name, commissionPct, paymentDay, couponCode, orderHistory, promoProducts }: AfiliadaContentProps) {
  const router = useRouter()
  const supabase = createClient()

  const firstName = name.split(' ')[0]
  const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')

  const [tab, setTab] = useState<Tab>('resumo')
  const [selectedKey, setSelectedKey] = useState<string>(() => orderHistory[0]?.key ?? '')
  const [salesKey, setSalesKey] = useState<string>(() => orderHistory[0]?.key ?? '')
  const [productFilter, setProductFilter] = useState<ProductFilter>('todos')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [copiedCoupon, setCopiedCoupon] = useState(false)
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null)

  const hasOrders = orderHistory.length > 0
  const currentMonth = orderHistory.find(m => m.key === selectedKey)
  const currentSalesMonth = orderHistory.find(m => m.key === salesKey)
  const maxBar = currentMonth ? Math.max(...currentMonth.weekBars, 1) : 1

  const hasCoupon = couponCode !== null
  const payDayLabel = paymentDay ? `dia ${paymentDay}` : 'dia 10'

  const pendingCommission = orderHistory[0]?.commission ?? 0
  const pendingPayDate    = orderHistory[0] ? getPayDate(orderHistory[0].key, paymentDay) : '—'

  const paymentsHistory = orderHistory.map((month, i) => ({
    month: `${month.label}/${month.labelFull.split('/')[1]}`,
    sales: month.sales,
    revenue: month.revenue,
    commission: month.commission,
    payDate: getPayDate(month.key, paymentDay),
    status: (i === 0 ? 'pendente' : 'pago') as 'pago' | 'pendente',
  }))

  const timeline = orderHistory.slice(0, 4).map((month, i) => ({
    value: fmt(month.commission),
    status: (i === 0 ? 'pendente' : 'pago') as 'pago' | 'pendente',
    ref: i === 0
      ? `Ref. ${month.label.toLowerCase()}/${month.labelFull.split('/')[1]} · vence ${getPayDate(month.key, paymentDay)}`
      : `Ref. ${month.label.toLowerCase()}/${month.labelFull.split('/')[1]} · pago em ${getPayDate(month.key, paymentDay)}`,
    dotYellow: i === 0,
  }))

  const favCount = favorites.size

  const visibleProducts = promoProducts.filter(pr => {
    if (productFilter === 'favoritos') return favorites.has(pr.id)
    return true
  })

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/afiliada/entrar')
  }

  const copyCoupon = () => {
    if (!hasCoupon) return
    navigator.clipboard.writeText(couponCode!).catch(() => {})
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
    const base = `${window.location.origin}/produto/${slug}`
    const link = hasCoupon ? `${base}?cupom=${couponCode}` : base
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
            onClick={handleLogout}
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
          <div className="hero-sub">
            {hasOrders && currentMonth
              ? `Aqui estão os seus dados de afiliada — ${currentMonth.labelFull}`
              : 'Aqui estão os seus dados de afiliada'}
          </div>
          <div className="cupom-block">
            <span className="cupom-label">Seu cupom</span>
            <span className="cupom-code">{couponCode ?? '—'}</span>
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
            {hasOrders && orderHistory.length > 1 && (
              <div className="period-row">
                <span className="section-label">Mês de referência</span>
                <div className="period-sel">
                  {orderHistory.map(m => (
                    <button
                      key={m.key}
                      className={`period-pill ${selectedKey === m.key ? 'active' : ''}`}
                      onClick={() => setSelectedKey(m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasOrders && currentMonth ? (
              <>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-label">Vendas no mês</div>
                    <div className="metric-value num">{currentMonth.sales}</div>
                    {currentMonth.deltaSales !== 0 && (
                      <div className={`metric-delta ${currentMonth.deltaSales >= 0 ? 'up' : 'down'}`}>
                        {currentMonth.deltaSales >= 0 ? '↑' : '↓'} {Math.abs(currentMonth.deltaSales)} vs. {currentMonth.prevLabel}
                      </div>
                    )}
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Receita gerada</div>
                    <div className="metric-value num" style={{ fontSize: 19 }}>{fmt(currentMonth.revenue)}</div>
                    {currentMonth.deltaRevenue !== 0 && (
                      <div className={`metric-delta ${currentMonth.deltaRevenue >= 0 ? 'up' : 'down'}`}>
                        {currentMonth.deltaRevenue >= 0 ? '↑' : '↓'} {fmt(Math.abs(currentMonth.deltaRevenue))} vs. {currentMonth.prevLabel}
                      </div>
                    )}
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Comissão do mês</div>
                    <div className="metric-value num" style={{ fontSize: 19, color: 'var(--ap-accent)' }}>
                      {fmt(currentMonth.commission)}
                    </div>
                    <div className="metric-delta neu">{commissionPct}% sobre a receita</div>
                  </div>
                </div>

                <div className="receber-card">
                  <div>
                    <div className="rec-label">total a receber</div>
                    <div className="rec-value">{fmt(pendingCommission)}</div>
                    <div className="rec-status">
                      {pendingCommission > 0 ? (
                        <>
                          <div className="status-dot yellow" />
                          <span className="rec-status-text">Pagamento em processamento</span>
                        </>
                      ) : (
                        <span className="rec-status-text" style={{ color: 'var(--ap-text-3)' }}>
                          Nenhuma comissão pendente
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rec-right">
                    <div className="rec-pay-label">previsão de pagamento</div>
                    <div className="rec-pay-date">{pendingCommission > 0 ? pendingPayDate : '—'}</div>
                    <div className="rec-pay-method">via PIX · {payDayLabel} do mês seguinte</div>
                  </div>
                </div>

                <div className="two-cols">
                  <div className="card">
                    <div className="card-header">
                      <span className="card-header-title">Vendas por semana</span>
                      <span style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>{currentMonth.labelFull}</span>
                    </div>
                    <div className="card-body">
                      {currentMonth.weekBars.map((count, i) => (
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
                      {timeline.length > 0 ? timeline.map((item, i) => (
                        <div className="tl-item" key={i}>
                          <div className="tl-left">
                            <div
                              className={`tl-dot ${!item.dotYellow && i > 0 ? 'gray' : ''}`}
                              style={item.dotYellow ? { background: 'var(--pc-gold-soft)' } : undefined}
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
                      )) : (
                        <p style={{ fontSize: 12, color: 'var(--ap-text-3)', margin: 0 }}>
                          Nenhum pagamento ainda.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: 'var(--ap-bg)',
                borderRadius: 12,
                border: '1px solid var(--ap-border)',
              }}>
                <div style={{ fontSize: 13, color: 'var(--ap-text-2)', marginBottom: 8, fontWeight: 500 }}>
                  Nenhuma venda registrada ainda
                </div>
                <div style={{ fontSize: 12, color: 'var(--ap-text-3)' }}>
                  {hasCoupon
                    ? `Compartilhe o cupom ${couponCode} com seus seguidores para começar.`
                    : 'Aguarde o Henrique configurar seu cupom no painel.'}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════ */}
        {/* TAB: VENDAS                   */}
        {/* ══════════════════════════════ */}
        {tab === 'vendas' && (
          <>
            {hasOrders && orderHistory.length > 1 && (
              <div className="period-row" style={{ marginBottom: 14 }}>
                <span className="section-label">Mês</span>
                <div className="period-sel">
                  {orderHistory.map(m => (
                    <button
                      key={m.key}
                      className={`period-pill ${salesKey === m.key ? 'active' : ''}`}
                      onClick={() => setSalesKey(m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasOrders && currentSalesMonth ? (
              <div className="card">
                <div className="card-header">
                  <span className="card-header-title">Vendas com seu cupom</span>
                  <span style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>
                    {currentSalesMonth.sales} {currentSalesMonth.sales === 1 ? 'venda' : 'vendas'} em {currentSalesMonth.labelFull}
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
                        {currentSalesMonth.items.map((s, i) => (
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
                            Total do mês ({currentSalesMonth.sales} {currentSalesMonth.sales === 1 ? 'venda' : 'vendas'})
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                            {fmt(currentSalesMonth.revenue)}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ap-accent)' }}>
                            {fmt(currentSalesMonth.commission)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: 'var(--ap-bg)',
                borderRadius: 12,
                border: '1px solid var(--ap-border)',
              }}>
                <div style={{ fontSize: 13, color: 'var(--ap-text-2)', marginBottom: 8, fontWeight: 500 }}>
                  Nenhuma venda registrada ainda
                </div>
                <div style={{ fontSize: 12, color: 'var(--ap-text-3)' }}>
                  As vendas feitas com o seu cupom aparecerão aqui.
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════ */}
        {/* TAB: PAGAMENTOS               */}
        {/* ══════════════════════════════ */}
        {tab === 'pagamentos' && (
          <>
            {paymentsHistory.length > 0 ? (
              <div className="card">
                <div className="card-header">
                  <span className="card-header-title">Histórico de pagamentos</span>
                  <span style={{ fontSize: 11, color: 'var(--ap-text-3)' }}>
                    {fmt(paymentsHistory.filter(ph => ph.status === 'pago').reduce((s, ph) => s + ph.commission, 0))} recebidos no total
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
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: 'var(--ap-bg)',
                borderRadius: 12,
                border: '1px solid var(--ap-border)',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, color: 'var(--ap-text-2)', marginBottom: 8, fontWeight: 500 }}>
                  Nenhum pagamento ainda
                </div>
                <div style={{ fontSize: 12, color: 'var(--ap-text-3)' }}>
                  Seu histórico de comissões aparecerá aqui conforme as vendas forem confirmadas.
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <span className="card-header-title">Dados para recebimento</span>
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
            {promoProducts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                color: 'var(--ap-text-3)', fontSize: 13,
                background: 'var(--ap-bg)', borderRadius: 10,
                border: '1px solid var(--ap-border)',
              }}>
                Nenhum produto disponível pra divulgar ainda.
                <div style={{ marginTop: 6, fontSize: 11 }}>
                  O Henrique ainda não marcou nenhum produto pra aparecer aqui.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--ap-text-2)', marginBottom: 14 }}>
                    Escolha os produtos que quer divulgar e copie o link
                    {hasCoupon ? ' com o seu cupom já incluído.' : '.'}
                  </div>
                  <div className="products-filter">
                    <button
                      className={`filter-pill ${productFilter === 'todos' ? 'active' : ''}`}
                      onClick={() => setProductFilter('todos')}
                    >
                      Todos ({promoProducts.length})
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
                      const image = pr.variants?.[0]?.images?.[0] ?? null
                      return (
                        <div className="product-card" key={pr.id}>
                          <div
                            className="product-thumb"
                            style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg,#ede8e0,#d4cfc5)' }}
                          />
                          <div className="product-body">
                            <div className="product-cat">{catLabel[pr.category] ?? pr.category}</div>
                            <div className="product-name">{pr.name}</div>
                            <div className="product-price">{fmt(pr.base_price)}</div>
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
          </>
        )}

      </div>
    </>
  )
}
