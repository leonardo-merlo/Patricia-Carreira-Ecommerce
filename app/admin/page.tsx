"use client"

import { AdminIcon } from '@/components/admin/admin-icon'

const kpis = [
  { label: "Pedidos hoje", value: "12", trend: { dir: "up", text: "+3 vs. ontem" }, dot: "#16a34a" },
  { label: "Receita do mês", value: "48.720", unit: "R$", trend: { dir: "up", text: "+12,4% vs. abril" }, dot: "#c97d60" },
  { label: "Estoque baixo", value: "7", trend: { warn: true, text: "produtos abaixo do mínimo" }, dot: "#b88516" },
  { label: "OPs abertas", value: "8", trend: { info: true, text: "3 em andamento" }, dot: "#2563eb" },
]

const orders = [
  { date: "08/05", time: "14:32", cust: "Marina Souza", type: "Varejo", value: "R$ 320,00", status: "pago" },
  { date: "08/05", time: "13:11", cust: "Boutique Lis (Belo Horizonte)", type: "Atacado", value: "R$ 4.890,00", status: "producao" },
  { date: "08/05", time: "11:48", cust: "Camila Ferreira", type: "Varejo", value: "R$ 189,90", status: "enviado" },
  { date: "08/05", time: "10:22", cust: "Renata Lopes", type: "Varejo", value: "R$ 540,00", status: "pendente" },
  { date: "07/05", time: "18:05", cust: "Ateliê Coimbra (Curitiba)", type: "Atacado", value: "R$ 7.220,00", status: "pago" },
  { date: "07/05", time: "16:40", cust: "Júlia Andrade", type: "Varejo", value: "R$ 268,00", status: "enviado" },
  { date: "07/05", time: "12:18", cust: "Beatriz Mendes", type: "Varejo", value: "R$ 410,00", status: "pago" },
]

const critical = [
  { name: "Bolsa Tiracolo Couro Marrom — M", current: 2, min: 8, kind: "produto", thumb: "bag" },
  { name: "Cinto Trançado Caramelo — Único", current: 0, min: 6, kind: "produto", thumb: "acc" },
  { name: "Couro Legítimo Caramelo (m²)", current: 1.8, min: 10, kind: "matéria", thumb: "mat" },
  { name: "Bolsa Saco Nylon Off-White — U", current: 4, min: 10, kind: "produto", thumb: "bag" },
  { name: "Forro Algodão Bege (m)", current: 6, min: 25, kind: "matéria", thumb: "mat" },
  { name: "Fivela Metal Dourado Pequena (un)", current: 14, min: 50, kind: "matéria", thumb: "mat" },
]

const activity = [
  { dot: "green", text: "Estoque atualizado", detail: "Bolsa Tiracolo Couro Preta M (+12)", meta: "há 6 min · Henrique" },
  { dot: "blue", text: "OP #042 criada", detail: "Bolsa Carteira Pequena Off-White × 30", meta: "há 22 min · Henrique" },
  { dot: "terra", text: "Pedido atacado", detail: "#A-118 confirmado · Boutique Lis", meta: "há 41 min · Henrique" },
  { dot: "purple", text: "Pedido", detail: "#V-2841 marcado como enviado · Camila Ferreira", meta: "há 1h 12min · Henrique" },
  { dot: "yellow", text: "Alerta", detail: "Couro Caramelo abaixo do estoque mínimo", meta: "há 2h · Sistema" },
]

const STATUS: Record<string, { cls: string; txt: string }> = {
  pago: { cls: "pago", txt: "Pago" },
  pendente: { cls: "pendente", txt: "Pendente" },
  producao: { cls: "producao", txt: "Em Produção" },
  enviado: { cls: "enviado", txt: "Enviado" },
}

const sparkPaths = [
  "M2 22 L14 18 L26 20 L38 12 L50 14 L62 8 L78 6",
  "M2 18 L14 20 L26 16 L38 18 L50 12 L62 10 L78 4",
  "M2 8 L14 10 L26 14 L38 12 L50 16 L62 18 L78 22",
  "M2 14 L14 16 L26 12 L38 14 L50 12 L62 16 L78 14",
]

export default function AdminDashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Bom dia, Henrique 👋</h2>
          <p className="page-sub">Visão geral da operação de hoje</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-nova-venda"><AdminIcon name="plus" /> Nova venda</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
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
              {k.trend.dir === "up" && (
                <span className="up"><AdminIcon name="arrowUp" size={11} /> {k.trend.text}</span>
              )}
              {k.trend.warn && (
                <span style={{ color: "var(--yellow)", display: "flex", gap: 4, alignItems: "center", fontWeight: 500 }}>
                  <AdminIcon name="alert" size={11} /> {k.trend.text}
                </span>
              )}
              {k.trend.info && !k.trend.dir && !k.trend.warn && (
                <span><AdminIcon name="info" size={11} /> {k.trend.text}</span>
              )}
            </div>
            <svg className="kpi-spark" width="80" height="28" viewBox="0 0 80 28" fill="none">
              <path d={sparkPaths[i]} stroke={k.dot} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d={sparkPaths[i] + " L78 28 L2 28 Z"} fill={k.dot} fillOpacity="0.08"/>
            </svg>
          </div>
        ))}
      </div>

      <div className="dash-row">
        <div className="card">
          <div className="card-header">
            <div className="row">
              <h3 className="ttl">Pedidos recentes</h3>
              <span className="sub">Últimos 7 pedidos</span>
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
                  {orders.map((o, i) => (
                    <tr key={i}>
                      <td>
                        <div>{o.date}</div>
                        <div className="cust-meta">{o.time}</div>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <div className="thumb" style={{
                            width: 22, height: 22, fontSize: 9,
                            background: o.type === "Atacado" ? "linear-gradient(135deg,#d8c89a,#a08956)" : "linear-gradient(135deg,#c9b6c9,#8b6b8b)",
                            color: "#fff"
                          }}>
                            {o.cust.split(" ").map(s => s[0]).slice(0, 2).join("")}
                          </div>
                          <span>{o.cust}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${o.type === "Atacado" ? "atacado" : "varejo"}`}>{o.type}</span>
                      </td>
                      <td className="num">{o.value}</td>
                      <td>
                        <span className={`badge ${STATUS[o.status].cls}`}>
                          <span className="dot" />
                          {STATUS[o.status].txt}
                        </span>
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
            <div className="row">
              <h3 className="ttl">Estoque crítico</h3>
              <span className="sub">{critical.length} itens</span>
            </div>
            <button className="linkish">Comprar tudo →</button>
          </div>
          <div className="card-body flush">
            <ul className="activity" style={{ borderTop: "none" }}>
              {critical.map((c, i) => {
                const out = c.current === 0
                return (
                  <li key={i} style={{ alignItems: "center", padding: "10px 16px" }}>
                    <div className={`thumb ${c.thumb}`} style={{ width: 30, height: 30 }}>
                      {c.kind === "matéria" ? <AdminIcon name="layers" size={14} /> : <AdminIcon name="bag" size={14} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                      </div>
                      <div className="cust-meta" style={{ display: "flex", gap: 8 }}>
                        <span>Atual: <b style={{ color: out ? "var(--red)" : "var(--yellow)" }}>{c.current}</b></span>
                        <span>·</span>
                        <span>Mín: {c.min}</span>
                      </div>
                    </div>
                    <span className={`badge ${out ? "alert" : "warn"}`}>
                      <AdminIcon name={out ? "xCircle" : "alert"} size={11} />
                      {out ? "Esgotado" : "Reabastecer"}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--gap)" }}>
        <div className="card-header">
          <div className="row">
            <h3 className="ttl">Atividade recente</h3>
            <span className="sub">Últimas 5 ações no sistema</span>
          </div>
          <button className="linkish">Histórico completo →</button>
        </div>
        <div className="card-body flush">
          <ul className="activity">
            {activity.map((a, i) => (
              <li key={i}>
                <span className={`dot ${a.dot}`} />
                <div style={{ flex: 1 }}>
                  <b>{a.text}</b> · {a.detail}
                  <span className="meta"> · {a.meta}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
