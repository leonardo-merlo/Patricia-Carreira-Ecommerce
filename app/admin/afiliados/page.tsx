"use client"

import { useState, Fragment } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type HistoryEntry = {
  month: string
  sales: number
  revenue: number
  commission: number
  paid: boolean
}

type Afiliada = {
  id: number
  name: string
  phone: string
  coupon: string
  commissionPct: number
  salesMonth: number
  revenueMonth: number
  commissionMonth: number
  paid: boolean
  totalSales: number
  totalRevenue: number
  totalCommission: number
  joinedDate: string
  history: HistoryEntry[]
}

const initialData: Afiliada[] = [
  {
    id: 1, name: "Ana Paula Ribeiro", phone: "(31) 9 9821-4455", coupon: "ANAPAULA15",
    commissionPct: 15, salesMonth: 12, revenueMonth: 3640, commissionMonth: 546, paid: false,
    totalSales: 78, totalRevenue: 22840, totalCommission: 3426, joinedDate: "mar/2025",
    history: [
      { month: "mai/2026", sales: 12, revenue: 3640, commission: 546, paid: false },
      { month: "abr/2026", sales: 9, revenue: 2820, commission: 423, paid: true },
      { month: "mar/2026", sales: 11, revenue: 3180, commission: 477, paid: true },
      { month: "fev/2026", sales: 7, revenue: 1980, commission: 297, paid: true },
    ]
  },
  {
    id: 2, name: "Fernanda Costa", phone: "(21) 9 9644-7788", coupon: "FERNANDA10",
    commissionPct: 10, salesMonth: 8, revenueMonth: 2480, commissionMonth: 248, paid: true,
    totalSales: 54, totalRevenue: 16920, totalCommission: 1692, joinedDate: "jun/2025",
    history: [
      { month: "mai/2026", sales: 8, revenue: 2480, commission: 248, paid: true },
      { month: "abr/2026", sales: 11, revenue: 3340, commission: 334, paid: true },
      { month: "mar/2026", sales: 6, revenue: 1820, commission: 182, paid: true },
      { month: "fev/2026", sales: 5, revenue: 1480, commission: 148, paid: true },
    ]
  },
  {
    id: 3, name: "Juliana Alves", phone: "(11) 9 8877-3322", coupon: "JULI10",
    commissionPct: 10, salesMonth: 5, revenueMonth: 1580, commissionMonth: 158, paid: false,
    totalSales: 32, totalRevenue: 9840, totalCommission: 984, joinedDate: "ago/2025",
    history: [
      { month: "mai/2026", sales: 5, revenue: 1580, commission: 158, paid: false },
      { month: "abr/2026", sales: 4, revenue: 1240, commission: 124, paid: true },
      { month: "mar/2026", sales: 6, revenue: 1920, commission: 192, paid: true },
    ]
  },
  {
    id: 4, name: "Mariana Teixeira", phone: "(41) 9 9211-8844", coupon: "MARI15",
    commissionPct: 15, salesMonth: 7, revenueMonth: 2140, commissionMonth: 321, paid: false,
    totalSales: 41, totalRevenue: 12480, totalCommission: 1872, joinedDate: "set/2025",
    history: [
      { month: "mai/2026", sales: 7, revenue: 2140, commission: 321, paid: false },
      { month: "abr/2026", sales: 9, revenue: 2760, commission: 414, paid: true },
      { month: "mar/2026", sales: 5, revenue: 1520, commission: 228, paid: true },
    ]
  },
  {
    id: 5, name: "Camila Duarte", phone: "(48) 9 9412-6633", coupon: "CAMILA10",
    commissionPct: 10, salesMonth: 3, revenueMonth: 940, commissionMonth: 94, paid: true,
    totalSales: 19, totalRevenue: 5920, totalCommission: 592, joinedDate: "nov/2025",
    history: [
      { month: "mai/2026", sales: 3, revenue: 940, commission: 94, paid: true },
      { month: "abr/2026", sales: 5, revenue: 1580, commission: 158, paid: true },
      { month: "mar/2026", sales: 2, revenue: 620, commission: 62, paid: true },
    ]
  },
  {
    id: 6, name: "Priscila Moreira", phone: "(51) 9 8833-1177", coupon: "PRISCILA10",
    commissionPct: 10, salesMonth: 6, revenueMonth: 1940, commissionMonth: 194, paid: false,
    totalSales: 28, totalRevenue: 8840, totalCommission: 884, joinedDate: "out/2025",
    history: [
      { month: "mai/2026", sales: 6, revenue: 1940, commission: 194, paid: false },
      { month: "abr/2026", sales: 4, revenue: 1280, commission: 128, paid: true },
      { month: "mar/2026", sales: 5, revenue: 1620, commission: 162, paid: true },
    ]
  },
  {
    id: 7, name: "Tatiane Gomes", phone: "(61) 9 9144-2255", coupon: "TATI12",
    commissionPct: 12, salesMonth: 4, revenueMonth: 1180, commissionMonth: 142, paid: false,
    totalSales: 15, totalRevenue: 4320, totalCommission: 518, joinedDate: "jan/2026",
    history: [
      { month: "mai/2026", sales: 4, revenue: 1180, commission: 142, paid: false },
      { month: "abr/2026", sales: 3, revenue: 880, commission: 106, paid: true },
    ]
  },
  {
    id: 8, name: "Beatriz Nascimento", phone: "(31) 9 9722-4488", coupon: "BIANE10",
    commissionPct: 10, salesMonth: 2, revenueMonth: 580, commissionMonth: 58, paid: true,
    totalSales: 8, totalRevenue: 2240, totalCommission: 224, joinedDate: "mar/2026",
    history: [
      { month: "mai/2026", sales: 2, revenue: 580, commission: 58, paid: true },
      { month: "abr/2026", sales: 3, revenue: 840, commission: 84, paid: true },
    ]
  },
]

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR")},00`

export default function AfiliadadosPage() {
  const [afiliadas, setAfiliadas] = useState<Afiliada[]>(initialData)
  const [tab, setTab] = useState<"todas" | "apagar" | "pagas">("todas")
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<Afiliada | null>(null)
  const [draft, setDraft] = useState<Afiliada | null>(null)

  const pendingCount = afiliadas.filter(a => !a.paid).length
  const paidCount = afiliadas.filter(a => a.paid).length
  const totalSalesMonth = afiliadas.reduce((s, a) => s + a.salesMonth, 0)
  const totalRevenueMonth = afiliadas.reduce((s, a) => s + a.revenueMonth, 0)
  const totalPending = afiliadas.filter(a => !a.paid).reduce((s, a) => s + a.commissionMonth, 0)

  const filtered = tab === "todas"
    ? afiliadas
    : tab === "apagar"
      ? afiliadas.filter(a => !a.paid)
      : afiliadas.filter(a => a.paid)

  const togglePaid = (id: number) => {
    setAfiliadas(prev => prev.map(a => a.id === id ? { ...a, paid: !a.paid } : a))
  }

  const openEdit = (a: Afiliada) => {
    setEditing(a)
    setDraft({ ...a })
  }

  const closeEdit = () => {
    setEditing(null)
    setDraft(null)
  }

  const saveEdit = () => {
    if (!draft) return
    setAfiliadas(prev => prev.map(a => a.id === draft.id ? { ...draft } : a))
    closeEdit()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Afiliadas</h2>
          <p className="page-sub">{afiliadas.length} ativas · {pendingCount} com pagamento pendente este mês</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-nova-afiliada" data-testid="btn-nova-afiliada">
            <AdminIcon name="plus" /> Nova afiliada
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: "#c97d60" }} />Afiliadas ativas</div>
          <div className="kpi-value">{afiliadas.length}</div>
          <div className="kpi-trend"><span className="subtle">total cadastradas</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: "#7c3aed" }} />Vendas no mês</div>
          <div className="kpi-value">{totalSalesMonth}</div>
          <div className="kpi-trend"><span className="subtle">via cupons de afiliadas</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: "#2563eb" }} />Receita gerada</div>
          <div className="kpi-value"><span className="unit">R$</span>{totalRevenueMonth.toLocaleString("pt-BR")}</div>
          <div className="kpi-trend"><span className="subtle">este mês</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot" style={{ background: "#d97706" }} />A pagar</div>
          <div className="kpi-value"><span className="unit">R$</span>{totalPending.toLocaleString("pt-BR")}</div>
          <div className="kpi-trend"><span className="subtle">{pendingCount} afiliadas pendentes</span></div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "todas" ? "active" : ""}`} onClick={() => setTab("todas")}>
          Todas <span className="count">{afiliadas.length}</span>
        </button>
        <button className={`tab ${tab === "apagar" ? "active" : ""}`} onClick={() => setTab("apagar")}>
          A pagar <span className="count">{pendingCount}</span>
        </button>
        <button className={`tab ${tab === "pagas" ? "active" : ""}`} onClick={() => setTab("pagas")}>
          Pagas <span className="count">{paidCount}</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="search-input" style={{ width: 280 }}>
            <AdminIcon name="search" size={13} />
            <input placeholder="Buscar por nome ou cupom..." />
          </div>
          <span style={{ flex: 1 }} />
          <span className="cust-meta">Ordenar por: <b style={{ color: "var(--text)" }}>Maior receita</b></span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Afiliada</th>
                  <th style={{ width: 150 }}>Cupom</th>
                  <th style={{ width: 90 }}>Comissão</th>
                  <th style={{ width: 100 }}>Vendas/mês</th>
                  <th style={{ width: 145 }}>Receita/mês</th>
                  <th style={{ width: 145 }}>Valor a pagar</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <Fragment key={a.id}>
                    <tr style={{ background: expanded === a.id ? "var(--surface-2)" : undefined }}>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                          title="Ver histórico"
                          data-testid={`btn-expand-${a.id}`}
                        >
                          <AdminIcon name={expanded === a.id ? "chevUp" : "chevDown"} size={14} />
                        </button>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                            background: "linear-gradient(135deg, #f0c8b0, #c97d60)",
                            color: "#fff", fontSize: 10, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {a.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{a.name}</div>
                            <div className="cust-meta tiny">{a.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 11.5,
                          background: "var(--surface-2)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--border)",
                          letterSpacing: "0.04em",
                          fontWeight: 600,
                        }}>
                          {a.coupon}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                          color: "var(--accent)",
                          padding: "2px 9px",
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}>
                          {a.commissionPct}%
                        </span>
                      </td>
                      <td className="num">{a.salesMonth}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{fmt(a.revenueMonth)}</td>
                      <td className="num" style={{ fontWeight: 600, color: a.paid ? "var(--text-3)" : "var(--text)" }}>
                        {fmt(a.commissionMonth)}
                      </td>
                      <td>
                        <button
                          data-testid={`btn-toggle-paid-${a.id}`}
                          style={{
                            background: a.paid ? "#dcfce7" : "#fef3c7",
                            color: a.paid ? "#15803d" : "#92400e",
                            border: "none",
                            padding: "3px 10px 3px 8px",
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onClick={() => togglePaid(a.id)}
                          title="Clique para alternar status de pagamento"
                        >
                          {a.paid
                            ? <><AdminIcon name="check" size={10} />Pago</>
                            : "Pendente"
                          }
                        </button>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={() => openEdit(a)}
                          title="Editar afiliada"
                          data-testid={`btn-edit-afiliada-${a.id}`}
                        >
                          <AdminIcon name="edit" size={14} />
                        </button>
                      </td>
                    </tr>

                    {expanded === a.id && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, background: "var(--surface-2)" }}>
                          <div style={{ padding: "2px 20px 16px 56px" }}>
                            <div style={{
                              fontSize: 10.5, fontWeight: 500, color: "var(--text-3)",
                              textTransform: "uppercase", letterSpacing: "0.06em",
                              padding: "10px 0 8px"
                            }}>
                              Histórico · desde {a.joinedDate} · {a.totalSales} vendas · {fmt(a.totalRevenue)} receita acumulada
                            </div>
                            <table className="tbl" style={{
                              background: "var(--bg)", borderRadius: 8, overflow: "hidden",
                              fontSize: 12.5,
                            }}>
                              <thead>
                                <tr>
                                  <th>Mês</th>
                                  <th style={{ width: 90 }}>Vendas</th>
                                  <th style={{ width: 155 }}>Receita</th>
                                  <th style={{ width: 155 }}>Comissão</th>
                                  <th style={{ width: 110 }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {a.history.map((h, j) => (
                                  <tr key={j}>
                                    <td style={{ fontWeight: j === 0 ? 500 : 400 }}>{h.month}</td>
                                    <td className="num">{h.sales}</td>
                                    <td className="num">{fmt(h.revenue)}</td>
                                    <td className="num" style={{ fontWeight: 500 }}>{fmt(h.commission)}</td>
                                    <td>
                                      <span style={{
                                        background: h.paid ? "#dcfce7" : "#fef3c7",
                                        color: h.paid ? "#15803d" : "#92400e",
                                        padding: "2px 8px",
                                        borderRadius: 20,
                                        fontSize: 11,
                                        fontWeight: 500,
                                      }}>
                                        {h.paid ? "Pago" : "Pendente"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ borderTop: "1px solid var(--border)" }}>
                                  <td style={{ fontWeight: 600, color: "var(--text-2)", fontSize: 11 }}>Total acumulado</td>
                                  <td className="num" style={{ fontWeight: 600 }}>{a.totalSales}</td>
                                  <td className="num" style={{ fontWeight: 600 }}>{fmt(a.totalRevenue)}</td>
                                  <td className="num" style={{ fontWeight: 600 }}>{fmt(a.totalCommission)}</td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`drawer-backdrop ${editing ? "open" : ""}`} onClick={closeEdit} />
      <div className={`drawer ${editing ? "open" : ""}`} data-testid="drawer-editar-afiliada">
        {draft && (
          <>
            <div className="drawer-header">
              <div>
                <h3>{draft.name}</h3>
                <div className="cust-meta">Afiliada · desde {draft.joinedDate}</div>
              </div>
              <button className="icon-btn" onClick={closeEdit}>
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="drawer-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Total em vendas</div>
                  <div className="kpi-value" style={{ fontSize: 20 }}>{draft.totalSales}</div>
                </div>
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Comissão total paga</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{fmt(draft.totalCommission)}</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div className="field">
                  <label>Nome</label>
                  <input
                    className="input"
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    id="input-afiliada-nome"
                  />
                </div>
                <div className="field">
                  <label>Telefone / WhatsApp</label>
                  <input
                    className="input"
                    value={draft.phone}
                    onChange={e => setDraft({ ...draft, phone: e.target.value })}
                    id="input-afiliada-telefone"
                  />
                </div>
                <div className="field">
                  <label>Cupom de desconto</label>
                  <input
                    className="input"
                    value={draft.coupon}
                    onChange={e => setDraft({ ...draft, coupon: e.target.value.toUpperCase() })}
                    id="input-afiliada-cupom"
                    style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.04em" }}
                  />
                </div>
                <div className="field">
                  <label>Comissão (%)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={50}
                    value={draft.commissionPct}
                    onChange={e => setDraft({ ...draft, commissionPct: Number(e.target.value) })}
                    id="input-afiliada-comissao"
                  />
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button className="btn ghost" onClick={closeEdit}>Fechar</button>
              <button className="btn primary" onClick={saveEdit} id="btn-salvar-afiliada" data-testid="btn-salvar-afiliada">
                Salvar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
