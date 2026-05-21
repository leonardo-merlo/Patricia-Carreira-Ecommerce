"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

const kpis = [
  { label: "Receita do mês", value: "48.720", unit: "R$", delta: "+12,4%", up: true, dot: "#c97d60" },
  { label: "Ticket médio", value: "286", unit: "R$", delta: "+4,2%", up: true, dot: "#2563eb" },
  { label: "Margem bruta", value: "62,4", unit: "%", delta: "−1,1 pp", up: false, dot: "#16a34a" },
  { label: "Pedidos", value: "168", unit: "", delta: "+8,7%", up: true, dot: "#7c3aed" },
]

const byCategory = [
  { name: "Bolsas", value: 28640, pct: 58.8, color: "#c97d60" },
  { name: "Roupas", value: 12490, pct: 25.6, color: "#7c3aed" },
  { name: "Acessórios", value: 7590, pct: 15.6, color: "#d8c89a" },
]

const topProducts = [
  { name: "Bolsa Tiracolo Couro Preto — M", units: 34, rev: "R$ 10.880,00" },
  { name: "Vestido Linho Midi Cru — M", units: 22, rev: "R$ 9.020,00" },
  { name: "Bolsa Carteira Pequena Off-White", units: 41, rev: "R$ 7.785,90" },
  { name: "Brinco Argola Banhada Dourado", units: 68, rev: "R$ 6.052,00" },
  { name: "Bolsa Saco Nylon Verde Oliva", units: 19, rev: "R$ 5.092,00" },
]

const months = ["jun", "jul", "ago", "set", "out", "nov", "dez", "jan", "fev", "mar", "abr", "mai"]
const values = [22, 28, 26, 31, 35, 42, 48, 33, 38, 41, 43, 48.7]
const maxV = 50
const barPcts = [100, 83, 71, 56, 47]

export default function RelatoriosPage() {
  const [period, setPeriod] = useState("Maio 2026")

  // SVG donut
  let acc = 0
  const donutArcs = byCategory.map((c) => {
    const dash = c.pct
    const gap = 100 - dash
    const off = 25 - acc
    acc += dash
    return { ...c, dash, gap, off }
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Relatórios</h2>
          <p className="page-sub">Performance de vendas, produtos e operação · {period}</p>
        </div>
        <div className="page-actions">
          <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: "auto" }}>
            <option>Maio 2026</option>
            <option>Abril 2026</option>
            <option>Últimos 90 dias</option>
            <option>Ano de 2026</option>
          </select>
          <button className="btn"><AdminIcon name="download" /> Exportar PDF</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label"><span className="dot" style={{ background: k.dot }} />{k.label}</div>
            <div className="kpi-value">
              {k.unit && k.unit !== "%" && <span className="unit">{k.unit}</span>}
              {k.value}
              {k.unit === "%" && <span className="unit" style={{ marginLeft: 2 }}>%</span>}
            </div>
            <div className="kpi-trend">
              <span className={k.up ? "up" : "down"}>
                <AdminIcon name={k.up ? "arrowUp" : "arrowDown"} size={11} /> {k.delta}
              </span>
              <span className="subtle">vs. abril</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-row" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="ttl">Receita mensal</h3>
              <div className="cust-meta" style={{ marginTop: 2 }}>Últimos 12 meses · valores em R$ mil</div>
            </div>
            <div className="row" style={{ gap: 12, fontSize: 11.5, color: "var(--text-2)" }}>
              <span className="row" style={{ gap: 4 }}><span style={{ width: 10, height: 10, background: "#c97d60", borderRadius: 2 }} /> Receita</span>
              <span className="row" style={{ gap: 4 }}><span style={{ width: 10, height: 2, background: "var(--text-3)", borderRadius: 2 }} /> Meta</span>
            </div>
          </div>
          <div className="card-body" style={{ padding: "18px 20px 14px" }}>
            <div style={{ position: "relative", height: 220 }}>
              {[0, 25, 50, 75, 100].map((p, i) => (
                <div key={i} style={{ position: "absolute", left: 28, right: 0, top: `${p}%`, borderTop: "1px dashed var(--border)" }} />
              ))}
              {[50, 37.5, 25, 12.5, 0].map((v, i) => (
                <div key={i} style={{ position: "absolute", left: 0, top: `${i * 25}%`, fontSize: 10, color: "var(--text-3)", transform: "translateY(-50%)" }}>{v}</div>
              ))}
              <div style={{ position: "absolute", left: 28, right: 0, top: `${(1 - 40 / 50) * 100}%`, borderTop: "1.5px dashed var(--text-3)" }} />
              <div style={{ position: "absolute", left: 32, right: 4, bottom: 0, top: 0, display: "flex", alignItems: "flex-end", gap: 10 }}>
                {values.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{
                      width: "100%",
                      height: `${(v / maxV) * 100}%`,
                      background: i === values.length - 1 ? "var(--accent)" : "var(--accent-soft-2)",
                      borderRadius: "4px 4px 0 0",
                    }} />
                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{months[i]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="ttl">Receita por categoria</h3>
            <span className="sub">Maio</span>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <svg width="120" height="120" viewBox="0 0 36 36">
                {donutArcs.map((c, i) => (
                  <circle key={i} r="15.915" cx="18" cy="18" fill="transparent"
                    stroke={c.color} strokeWidth="4.5"
                    strokeDasharray={`${c.dash} ${c.gap}`} strokeDashoffset={c.off} />
                ))}
                <text x="18" y="19" textAnchor="middle" fontSize="5" fontWeight="600" fill="var(--text)">R$48,7k</text>
                <text x="18" y="24" textAnchor="middle" fontSize="2.6" fill="var(--text-3)">total</text>
              </svg>
              <div style={{ flex: 1, display: "grid", gap: 8 }}>
                {byCategory.map((c, i) => (
                  <div key={i}>
                    <div className="row between" style={{ fontSize: 12.5 }}>
                      <span className="row" style={{ gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                        {c.name}
                      </span>
                      <span className="num" style={{ fontWeight: 500 }}>{c.pct}%</span>
                    </div>
                    <div className="cust-meta tiny" style={{ paddingLeft: 14 }}>R$ {c.value.toLocaleString("pt-BR")},00</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-row" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card">
          <div className="card-header">
            <h3 className="ttl">Produtos mais vendidos</h3>
            <button className="linkish">Ver todos →</button>
          </div>
          <div className="card-body flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Produto</th>
                  <th style={{ width: 90 }}>Unidades</th>
                  <th style={{ width: 130 }}>Receita</th>
                  <th style={{ width: 140 }}>Participação</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td><span className="cust-meta">{i + 1}</span></td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div className="thumb bag" style={{ width: 24, height: 24 }}><AdminIcon name="bag" size={12} /></div>
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="num">{p.units}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{p.rev}</td>
                    <td>
                      <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${barPcts[i]}%`, background: "var(--accent)" }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="ttl">Canais de venda</h3></div>
          <div className="card-body" style={{ display: "grid", gap: 14 }}>
            {[
              { label: "E-commerce (Varejo)", val: 32480, pct: 66.7, color: "#c97d60" },
              { label: "Atacado (Manual)", val: 16240, pct: 33.3, color: "#7c3aed" },
            ].map((c, i) => (
              <div key={i}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.label}</span>
                  <span className="num" style={{ fontSize: 12.5 }}>R$ {c.val.toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${c.pct}%`, background: c.color }} />
                </div>
                <div className="cust-meta tiny" style={{ marginTop: 3 }}>{c.pct}% da receita</div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "grid", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
              <div className="row between"><span>Novos clientes (varejo)</span><span className="num" style={{ color: "var(--text)", fontWeight: 500 }}>47</span></div>
              <div className="row between"><span>Recorrentes</span><span className="num" style={{ color: "var(--text)", fontWeight: 500 }}>21</span></div>
              <div className="row between"><span>Atacadistas ativos</span><span className="num" style={{ color: "var(--text)", fontWeight: 500 }}>8</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
