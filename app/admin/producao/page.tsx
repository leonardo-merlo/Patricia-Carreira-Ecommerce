"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type OpStatus = "Rascunho" | "Aprovado" | "Em Andamento" | "Concluído"

const ops = [
  { num: "042", product: "Bolsa Carteira Pequena Off-White", variant: "Único", qty: 30, status: "Em Andamento" as OpStatus, check: "ok", created: "07/05" },
  { num: "041", product: "Bolsa Tiracolo Couro Marrom", variant: "M", qty: 25, status: "Aprovado" as OpStatus, check: "ok", created: "06/05" },
  { num: "040", product: "Vestido Linho Midi Cru", variant: "M", qty: 12, status: "Aprovado" as OpStatus, check: "ok", created: "06/05" },
  { num: "039", product: "Bolsa Tiracolo Couro Caramelo", variant: "M", qty: 20, status: "Rascunho" as OpStatus, check: "fail", created: "05/05" },
  { num: "038", product: "Cinto Trançado Caramelo", variant: "Único", qty: 40, status: "Rascunho" as OpStatus, check: "fail", created: "05/05" },
  { num: "037", product: "Brinco Argola Banhada", variant: "Dourado", qty: 60, status: "Em Andamento" as OpStatus, check: "ok", created: "04/05" },
  { num: "036", product: "Bolsa Saco Nylon Off-White", variant: "Único", qty: 15, status: "Em Andamento" as OpStatus, check: "ok", created: "04/05" },
  { num: "035", product: "Vestido Linho Midi Verde Sálvia", variant: "G", qty: 10, status: "Concluído" as OpStatus, check: "ok", created: "02/05" },
  { num: "034", product: "Bolsa Tiracolo Couro Preto", variant: "P", qty: 22, status: "Concluído" as OpStatus, check: "ok", created: "01/05" },
]

const insufficient = [
  { material: "Couro Legítimo Caramelo", needed: "3,6 m²", available: "1,8 m²", missing: "1,8 m²", short: true },
  { material: "Forro Algodão Bege", needed: "4,4 m", available: "6 m", missing: "—", short: false },
  { material: "Linha Algodão Encerada", needed: "240 m", available: "320 m", missing: "—", short: false },
  { material: "Fivela Metal Dourado M", needed: "20 un", available: "88 un", missing: "—", short: false },
  { material: "Alça de Couro 80cm", needed: "20 un", available: "42 un", missing: "—", short: false },
  { material: "Etiqueta Marca PC", needed: "20 un", available: "580 un", missing: "—", short: false },
]

const STATUS_CLS: Record<OpStatus, string> = {
  Rascunho: "neutral",
  Aprovado: "varejo",
  "Em Andamento": "producao",
  Concluído: "pago",
}

function getAction(status: OpStatus) {
  if (status === "Rascunho") return { label: "Verificar Materiais", icon: "checkCircle" as const }
  if (status === "Aprovado") return { label: "Iniciar Produção", icon: "factory" as const, primary: true }
  if (status === "Em Andamento") return { label: "Concluir", icon: "check" as const, primary: true }
  return null
}

export default function ProducaoPage() {
  const [activeTab, setActiveTab] = useState<string>("Todos")
  const [showInsuf, setShowInsuf] = useState<string | null>(null)

  const tabs = [
    { id: "Todos", count: ops.length },
    { id: "Rascunho", count: ops.filter(o => o.status === "Rascunho").length },
    { id: "Aprovado", count: ops.filter(o => o.status === "Aprovado").length },
    { id: "Em Andamento", count: ops.filter(o => o.status === "Em Andamento").length },
    { id: "Concluído", count: ops.filter(o => o.status === "Concluído").length },
  ]

  const filtered = activeTab === "Todos" ? ops : ops.filter(o => o.status === activeTab)
  const emAndamento = ops.filter(o => o.status === "Em Andamento").length
  const aprovados = ops.filter(o => o.status === "Aprovado").length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Ordens de Produção</h2>
          <p className="page-sub">{emAndamento} em andamento · {aprovados} aprovadas aguardando início</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-nova-op"><AdminIcon name="plus" /> Nova ordem</button>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "0 16px" }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {tabs.map(t => (
              <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
                {t.id} <span className="count">{t.count}</span>
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
              <div className="search-input" style={{ width: 220 }}>
                <AdminIcon name="search" size={13} />
                <input placeholder="Buscar OP..." />
              </div>
            </div>
          </div>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>#</th>
                  <th>Produto</th>
                  <th style={{ width: 90 }}>Quantidade</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 200 }}>Verificação de MP</th>
                  <th style={{ width: 100 }}>Criado em</th>
                  <th style={{ width: 200 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const action = getAction(o.status)
                  return (
                    <tr key={o.num}>
                      <td>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--text-2)" }}>
                          OP #{o.num}
                        </span>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <div className="thumb bag" style={{ width: 24, height: 24 }}>
                            <AdminIcon name="bag" size={12} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{o.product}</div>
                            <div className="cust-meta">Variante: {o.variant}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 500 }}>{o.qty} un.</td>
                      <td>
                        <span className={`badge ${STATUS_CLS[o.status]}`}>
                          <span className="dot" />
                          {o.status}
                        </span>
                      </td>
                      <td>
                        {o.check === "ok" ? (
                          <span style={{ color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500 }}>
                            <AdminIcon name="checkCircle" size={13} /> Materiais suficientes
                          </span>
                        ) : (
                          <div className="row" style={{ gap: 6 }}>
                            <span style={{ color: "var(--red)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500 }}>
                              <AdminIcon name="xCircle" size={13} /> Insuficientes
                            </span>
                            <button className="linkish" onClick={() => setShowInsuf(o.num)} style={{ fontSize: 11.5 }}>
                              Ver detalhes
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="cust-meta">{o.created}/2026</td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                          {action && (
                            <button className={`btn sm ${action.primary ? "primary" : ""}`} id={`btn-op-${o.num}`}>
                              <AdminIcon name={action.icon} size={11} /> {action.label}
                            </button>
                          )}
                          <button className="icon-btn"><AdminIcon name="moreH" size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showInsuf && (
        <div className="modal-backdrop" onClick={() => setShowInsuf(null)}>
          <div className="modal" style={{ width: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>
                  <AdminIcon name="alert" size={14} style={{ verticalAlign: -2, marginRight: 6, color: "var(--red)" }} />
                  Materiais Insuficientes — OP #{showInsuf}
                </h3>
                <div className="sub">Bolsa Tiracolo Couro Caramelo M · 20 unidades</div>
              </div>
              <button className="icon-btn" onClick={() => setShowInsuf(null)}><AdminIcon name="x" size={14} /></button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th style={{ width: 100 }}>Necessário</th>
                    <th style={{ width: 100 }}>Disponível</th>
                    <th style={{ width: 100 }}>Faltando</th>
                  </tr>
                </thead>
                <tbody>
                  {insufficient.map((m, i) => (
                    <tr key={i} style={m.short ? { background: "var(--red-soft)" } : {}}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          {m.short
                            ? <AdminIcon name="xCircle" size={13} style={{ color: "var(--red)" }} />
                            : <AdminIcon name="check" size={13} style={{ color: "var(--green)" }} />
                          }
                          <span style={{ fontWeight: m.short ? 600 : 400, color: m.short ? "var(--red)" : "var(--text)" }}>
                            {m.material}
                          </span>
                        </div>
                      </td>
                      <td className="num">{m.needed}</td>
                      <td className="num">{m.available}</td>
                      <td className="num" style={{ fontWeight: 600, color: m.short ? "var(--red)" : "var(--text-3)" }}>
                        {m.missing}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "12px 20px", background: "var(--surface-2)", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-2)" }}>
                <AdminIcon name="info" size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                Falta <b>1,8 m²</b> de Couro Legítimo Caramelo. Crie uma entrada de estoque ou suspenda esta OP até o reabastecimento.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowInsuf(null)}>Fechar</button>
              <button className="btn danger-outline">Suspender OP</button>
              <button className="btn primary" id="btn-prosseguir-op">Prosseguir mesmo assim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
