"use client" // tabs + expanded order rows state

import { Fragment, useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { formatPrice } from '@/lib/utils'
import type { RetailOrderRow } from '@/lib/supabase/admin-queries'

interface PedidosClientProps {
  varejo: RetailOrderRow[]
}

const PAYMENT_STATUS_MAP: Record<string, { cls: string; txt: string }> = {
  pending: { cls: 'pendente', txt: 'Pendente' },
  paid: { cls: 'pago', txt: 'Pago' },
  failed: { cls: 'cancelado', txt: 'Falhou' },
}

const ENTREGA_MAP: Record<string, { cls: string; txt: string }> = {
  pending:    { cls: 'neutral',   txt: '—' },
  paid:       { cls: 'neutral',   txt: 'A preparar' },
  separating: { cls: 'pendente',  txt: 'Separando' },
  shipped:    { cls: 'pago',      txt: 'Enviado' },
  delivered:  { cls: 'enviado',   txt: 'Entregue' },
  cancelled:  { cls: 'cancelado', txt: 'Cancelado' },
}

function getPaymentMethodLabel(method: string | null): string {
  if (!method) return '—'
  const map: Record<string, string> = { pix: 'PIX', credit_card: 'Cartão de crédito', boleto: 'Boleto' }
  return map[method] ?? method
}

// Mock atacado data — to be replaced when atacado module is built
const atacadoMock = [
  { num: 'A-118', date: '08/05', cust: 'Boutique Lis', contact: 'Maria Lis · (31) 9 9988-1122', cnpj: '12.345.678/0001-90', items: 38, total: 'R$ 4.890,00', op: 'OP #042', status: 'producao' as const },
  { num: 'A-117', date: '07/05', cust: 'Ateliê Coimbra', contact: 'Júlia Coimbra · (41) 9 9712-3344', cnpj: '33.221.118/0001-22', items: 52, total: 'R$ 7.220,00', op: 'OP #041', status: 'pago' as const },
  { num: 'A-116', date: '06/05', cust: 'Loja Flora SP', contact: 'Marcela Flora · (11) 9 8866-2244', cnpj: '08.776.554/0001-11', items: 24, total: 'R$ 3.180,00', op: 'OP #040', status: 'producao' as const },
  { num: 'A-115', date: '04/05', cust: 'Ponto da Bolsa', contact: 'Eliana Pinto · (51) 9 9911-7788', cnpj: '44.112.998/0001-55', items: 60, total: 'R$ 8.640,00', op: '—', status: 'enviado' as const },
  { num: 'A-114', date: '02/05', cust: 'Coquetel Acessórios', contact: 'Beatriz Sá · (21) 9 9421-1212', cnpj: '55.998.227/0001-08', items: 18, total: 'R$ 1.962,00', op: '—', status: 'pago' as const },
]

const ATACADO_STATUS: Record<string, { cls: string; txt: string }> = {
  pago: { cls: 'pago', txt: 'Pago' },
  pendente: { cls: 'pendente', txt: 'Pendente' },
  producao: { cls: 'producao', txt: 'Em Produção' },
  enviado: { cls: 'enviado', txt: 'Enviado' },
  cancelado: { cls: 'cancelado', txt: 'Cancelado' },
}

export function PedidosClient({ varejo }: PedidosClientProps) {
  const [tab, setTab] = useState<'varejo' | 'atacado'>('varejo')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredVarejo = varejo.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase()
      if (!o.customer_name.toLowerCase().includes(q) && !o.display_num.toLowerCase().includes(q)) return false
    }
    return true
  })

  const varejoTotal = filteredVarejo.reduce((s, o) => s + o.total, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Pedidos</h2>
          <p className="page-sub">
            {varejo.length} pedido{varejo.length !== 1 ? 's' : ''} varejo · {atacadoMock.length} pedidos atacado
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => alert('Exportar CSV — em breve')}><AdminIcon name="download" /> Exportar</button>
          {tab === 'atacado' && (
            <button className="btn primary" id="btn-novo-pedido-atacado">
              <AdminIcon name="plus" /> Novo pedido atacado
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'varejo' ? 'active' : ''}`} onClick={() => setTab('varejo')}>
          <AdminIcon name="cart" size={13} /> Varejo (E-commerce) <span className="count">{varejo.length}</span>
        </button>
        <button className={`tab ${tab === 'atacado' ? 'active' : ''}`} onClick={() => setTab('atacado')}>
          <AdminIcon name="truck" size={13} /> Atacado (Manual) <span className="count">{atacadoMock.length}</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, flex: 1 }}>
            <div className="search-input" style={{ width: 240 }}>
              <AdminIcon name="search" size={13} />
              <input
                placeholder={tab === 'varejo' ? 'Buscar por cliente ou pedido...' : 'Buscar por cliente, CNPJ...'}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="separating">Separando</option>
              <option value="shipped">Enviado</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          {tab === 'varejo' && (
            <div className="cust-meta">
              Total: <b style={{ color: 'var(--text)' }}>{formatPrice(varejoTotal)}</b>
            </div>
          )}
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                {tab === 'varejo' ? (
                  <tr>
                    <th style={{ width: 90 }}>#</th>
                    <th style={{ width: 70 }}>Data</th>
                    <th>Cliente</th>
                    <th style={{ width: 70 }}>Itens</th>
                    <th style={{ width: 110 }}>Total</th>
                    <th style={{ width: 110 }}>Pagamento</th>
                    <th style={{ width: 110 }}>Entrega</th>
                    <th style={{ width: 50 }}>Ações</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: 80 }}>#</th>
                    <th style={{ width: 70 }}>Data</th>
                    <th>Cliente</th>
                    <th style={{ width: 70 }}>Itens</th>
                    <th style={{ width: 110 }}>Total</th>
                    <th style={{ width: 110 }}>OP vinculada</th>
                    <th style={{ width: 130 }}>Status</th>
                    <th style={{ width: 80 }}>Ações</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tab === 'varejo' && (
                  filteredVarejo.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-3)' }}>
                        Nenhum pedido encontrado.
                      </td>
                    </tr>
                  ) : filteredVarejo.map((o) => {
                    const isExpanded = expandedOrder === o.id
                    const initials = o.customer_name.split(' ').map((s) => s[0]).slice(0, 2).join('')
                    const payBadge = PAYMENT_STATUS_MAP[o.payment_status] ?? { cls: 'neutral', txt: o.payment_status }
                    const entrega = ENTREGA_MAP[o.status] ?? { cls: 'neutral', txt: '—' }
                    return (
                      <Fragment key={o.id}>
                        <tr style={isExpanded ? { background: 'var(--surface-2)' } : {}}>
                          <td>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'var(--text-2)' }}>
                              {o.display_num}
                            </span>
                          </td>
                          <td>{o.date}</td>
                          <td>
                            <div className="row" style={{ gap: 8 }}>
                              <div className="thumb" style={{
                                width: 22, height: 22, fontSize: 9,
                                background: 'linear-gradient(135deg,#c9b6c9,#8b6b8b)', color: '#fff',
                              }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                                <div className="cust-meta">{o.customer_location}</div>
                              </div>
                            </div>
                          </td>
                          <td className="num">{o.item_count}</td>
                          <td className="num" style={{ fontWeight: 500 }}>{formatPrice(o.total)}</td>
                          <td>
                            <span className={`badge ${payBadge.cls}`}>
                              <span className="dot" />{payBadge.txt}
                            </span>
                          </td>
                          <td>
                            {entrega.txt === '—'
                              ? <span className="cust-meta">—</span>
                              : <span className={`badge ${entrega.cls}`}><span className="dot" />{entrega.txt}</span>
                            }
                          </td>
                          <td>
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              <button
                                className="icon-btn"
                                title={isExpanded ? 'Fechar detalhes' : 'Ver detalhes'}
                                onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                              >
                                <AdminIcon name={isExpanded ? 'chevUp' : 'chevDown'} size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0, borderBottom: 'none' }}>
                              <div style={{
                                display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr',
                                background: 'var(--surface)', borderTop: '1px solid var(--border)',
                              }}>
                                {/* Itens */}
                                <div style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
                                  <div className="cust-meta" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Itens</div>
                                  {o.items.length === 0 ? (
                                    <div className="cust-meta" style={{ fontSize: 12 }}>Sem itens registrados.</div>
                                  ) : o.items.map((it, idx) => (
                                    <div key={it.id} style={{
                                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                                      borderBottom: idx < o.items.length - 1 ? '1px dashed var(--border)' : 'none',
                                    }}>
                                      <div className="thumb bag" style={{ width: 28, height: 28, flexShrink: 0 }}>
                                        <AdminIcon name="bag" size={12} />
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.name}</div>
                                        <div className="cust-meta tiny">{it.sku} · Qtd. {it.quantity}</div>
                                      </div>
                                      <div className="num" style={{ fontSize: 12.5, flexShrink: 0 }}>{formatPrice(it.unit_price)}</div>
                                    </div>
                                  ))}
                                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                                    <span>Total</span><span>{formatPrice(o.total)}</span>
                                  </div>
                                </div>
                                {/* Endereço */}
                                <div style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
                                  <div className="cust-meta" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Endereço de envio</div>
                                  {o.address ? (
                                    <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                                      <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                                      <div>{o.address.street}, {o.address.number}{o.address.complement ? `, ${o.address.complement}` : ''}</div>
                                      <div>{o.address.neighborhood} · {o.address.city}/{o.address.state}</div>
                                      <div>CEP {o.address.zip}</div>
                                    </div>
                                  ) : (
                                    <div className="cust-meta" style={{ fontSize: 12 }}>Endereço não disponível.</div>
                                  )}
                                </div>
                                {/* Pagamento & Envio */}
                                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                  <div>
                                    <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Pagamento</div>
                                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{getPaymentMethodLabel(o.payment_method)}</div>
                                    <div style={{ marginTop: 3 }}>
                                      {(() => {
                                        const p = PAYMENT_STATUS_MAP[o.payment_status] ?? { cls: 'neutral', txt: o.payment_status }
                                        return <span className={`badge ${p.cls}`} style={{ fontSize: 11 }}><span className="dot" />{p.txt}</span>
                                      })()}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Rastreio</div>
                                    {o.tracking_code ? (
                                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em' }}>{o.tracking_code}</div>
                                    ) : (
                                      <div className="cust-meta" style={{ fontSize: 12 }}>Não disponível</div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="cust-meta" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10.5, fontWeight: 500 }}>Nota fiscal</div>
                                    {o.nfe_url ? (
                                      <a href={o.nfe_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline', fontWeight: 500 }}>
                                        NF-e {o.nfe_number} — Ver DANFE
                                      </a>
                                    ) : (
                                      <div className="cust-meta" style={{ fontSize: 12 }}>Não emitida</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}

                {tab === 'atacado' && atacadoMock.map((o) => (
                  <tr key={o.num}>
                    <td><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'var(--text-2)' }}>{o.num}</span></td>
                    <td>{o.date}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div className="thumb" style={{ width: 22, height: 22, fontSize: 9, background: 'linear-gradient(135deg,#d8c89a,#a08956)', color: '#fff' }}>
                          {o.cust.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{o.cust}</div>
                          <div className="cust-meta">{o.cnpj} · {o.contact}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{o.items}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{o.total}</td>
                    <td>{o.op === '—' ? <span className="cust-meta">—</span> : <button className="linkish" style={{ fontSize: 12 }}>{o.op}</button>}</td>
                    <td>
                      <span className={`badge ${ATACADO_STATUS[o.status].cls}`}>
                        <span className="dot" />{ATACADO_STATUS[o.status].txt}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                        <button className="btn sm ghost"><AdminIcon name="eye" size={11} /> Ver</button>
                        <button className="icon-btn"><AdminIcon name="moreH" size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
