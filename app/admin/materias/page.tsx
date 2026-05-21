"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type Material = {
  name: string; unit: string; current: number; min: number
  cost: string; supplier: string
}

const materials: Material[] = [
  { name: "Couro Legítimo Marrom", unit: "m²", current: 12.4, min: 10, cost: "R$ 78,00", supplier: "Curtume Vargas (RS)" },
  { name: "Couro Legítimo Caramelo", unit: "m²", current: 1.8, min: 10, cost: "R$ 82,00", supplier: "Curtume Vargas (RS)" },
  { name: "Couro Legítimo Preto", unit: "m²", current: 18.6, min: 8, cost: "R$ 78,00", supplier: "Curtume Vargas (RS)" },
  { name: "Forro Algodão Bege", unit: "m", current: 6, min: 25, cost: "R$ 14,50", supplier: "Tecidos São Paulo" },
  { name: "Linha Algodão Encerada", unit: "m", current: 320, min: 200, cost: "R$ 0,18", supplier: "Linhas Veneza" },
  { name: "Fivela Metal Dourado P", unit: "un", current: 14, min: 50, cost: "R$ 6,80", supplier: "Metal Acessórios SP" },
  { name: "Fivela Metal Dourado M", unit: "un", current: 88, min: 30, cost: "R$ 8,40", supplier: "Metal Acessórios SP" },
  { name: "Alça de Couro 80cm", unit: "un", current: 42, min: 20, cost: "R$ 22,00", supplier: "Curtume Vargas (RS)" },
  { name: "Etiqueta Marca PC", unit: "un", current: 580, min: 100, cost: "R$ 0,90", supplier: "Etiquetas Bordadas Cia." },
  { name: "Linho Cru 1,40m", unit: "m", current: 38, min: 15, cost: "R$ 32,00", supplier: "Tecidos São Paulo" },
]

const bom = [
  { material: "Couro Legítimo Marrom", qty: "0,18", unit: "m²" },
  { material: "Forro Algodão Bege", qty: "0,22", unit: "m" },
  { material: "Linha Algodão Encerada", qty: "12", unit: "m" },
  { material: "Fivela Metal Dourado M", qty: "1", unit: "un" },
  { material: "Alça de Couro 80cm", qty: "1", unit: "un" },
  { material: "Etiqueta Marca PC", qty: "1", unit: "un" },
]

function stockState(cur: number, min: number) {
  if (cur === 0) return { cls: "out", badge: <span className="badge esgotado">Esgotado</span> }
  if (cur < min) return { cls: "low", badge: <span className="badge baixo">Baixo</span> }
  return { cls: "ok", badge: null }
}

const lowCount = materials.filter(m => m.current < m.min).length

export default function MateriasPage() {
  const [entryFor, setEntryFor] = useState<Material | null>(null)
  const [selectedProduct, setSelectedProduct] = useState("Bolsa Tiracolo Couro Marrom — M")

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Matérias-Primas</h2>
          <p className="page-sub">{materials.length} insumos cadastrados · {lowCount} abaixo do estoque mínimo</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="history" /> Histórico de entradas</button>
          <button className="btn primary" id="btn-nova-materia"><AdminIcon name="plus" /> Nova matéria-prima</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "var(--gap)" }}>
        <div className="card">
          <div className="card-header">
            <div className="row">
              <h3 className="ttl">Insumos</h3>
              <span className="sub">Atualizado há 2 min</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <div className="search-input" style={{ width: 180 }}>
                <AdminIcon name="search" size={13} />
                <input placeholder="Buscar..." />
              </div>
              <button className="icon-btn" title="Filtrar"><AdminIcon name="filter" size={13} /></button>
            </div>
          </div>
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th style={{ width: 60 }}>Un.</th>
                    <th style={{ width: 80 }}>Atual</th>
                    <th style={{ width: 70 }}>Mín.</th>
                    <th style={{ width: 90 }}>Custo/un.</th>
                    <th>Fornecedor</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, i) => {
                    const s = stockState(m.current, m.min)
                    return (
                      <tr key={i}>
                        <td>
                          <div className="row" style={{ gap: 8 }}>
                            <div className="thumb mat" style={{ width: 22, height: 22 }}>
                              <AdminIcon name="layers" size={11} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <span style={{ fontWeight: 500, fontSize: 12.5 }}>{m.name}</span>
                              {s.badge}
                            </div>
                          </div>
                        </td>
                        <td className="cust-meta">{m.unit}</td>
                        <td className="num">
                          <span className={`stock-num ${s.cls}`}>{m.current.toLocaleString("pt-BR")}</span>
                        </td>
                        <td className="num cust-meta">{m.min}</td>
                        <td className="num cust-meta">{m.cost}</td>
                        <td className="cust-meta" style={{ fontSize: 11.5 }}>{m.supplier}</td>
                        <td>
                          <div className="row" style={{ justifyContent: "flex-end", gap: 2 }}>
                            <button className="btn sm primary" id={`btn-entrada-${i}`} onClick={() => setEntryFor(m)}>
                              <AdminIcon name="plus" size={11} /> Entrada
                            </button>
                            <button className="icon-btn" title="Histórico"><AdminIcon name="history" size={13} /></button>
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

        <div className="card" style={{ alignSelf: "flex-start", position: "sticky", top: 78 }}>
          <div className="card-header">
            <div>
              <h3 className="ttl">Receitas de Produto</h3>
              <div className="cust-meta" style={{ marginTop: 2 }}>
                <AdminIcon name="info" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                Define quanto consome de cada matéria-prima por unidade fabricada.
              </div>
            </div>
          </div>
          <div className="card-body" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="field">
              <label>Variante de produto</label>
              <select className="select" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option>Bolsa Tiracolo Couro Marrom — M</option>
                <option>Bolsa Tiracolo Couro Preto — P</option>
                <option>Bolsa Carteira Pequena Off-White — Único</option>
                <option>Vestido Linho Midi Cru — M</option>
              </select>
            </div>
          </div>
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th style={{ width: 90 }}>Qtd. / un.</th>
                    <th style={{ width: 60 }}>Un.</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((b, i) => (
                    <tr key={i}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <div className="thumb mat" style={{ width: 22, height: 22 }}>
                            <AdminIcon name="layers" size={11} />
                          </div>
                          {b.material}
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 500 }}>{b.qty}</td>
                      <td className="cust-meta">{b.unit}</td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          <button className="icon-btn"><AdminIcon name="x" size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="linkish" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <AdminIcon name="plus" size={12} /> Adicionar material
            </button>
            <div className="cust-meta tiny">
              Custo estimado por un.: <b style={{ color: "var(--text)" }}>R$ 47,82</b>
            </div>
          </div>
        </div>
      </div>

      {entryFor && (
        <div className="modal-backdrop" onClick={() => setEntryFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Entrada de Estoque</h3>
                <div className="sub">{entryFor.name} · estoque atual {entryFor.current} {entryFor.unit}</div>
              </div>
              <button className="icon-btn" onClick={() => setEntryFor(null)}><AdminIcon name="x" size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label>Quantidade a adicionar</label>
                    <div style={{ display: "flex" }}>
                      <input className="input" defaultValue="20" style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                      <span style={{ display: "grid", placeItems: "center", background: "var(--surface-2)", border: "1px solid var(--border-input)", borderLeft: "none", padding: "0 12px", borderTopRightRadius: 6, borderBottomRightRadius: 6, color: "var(--text-2)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {entryFor.unit}
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Motivo</label>
                    <select className="select">
                      <option>Compra</option>
                      <option>Ajuste de inventário</option>
                      <option>Devolução</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Fornecedor</label>
                  <select className="select" defaultValue={entryFor.supplier}>
                    <option>{entryFor.supplier}</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label>Nº da nota fiscal</label>
                    <input className="input" placeholder="Ex.: 001234" />
                  </div>
                  <div className="field">
                    <label>Custo total da entrada</label>
                    <input className="input" placeholder="R$ 1.560,00" />
                  </div>
                </div>
                <div className="field">
                  <label>Observações</label>
                  <textarea className="input" rows={2} style={{ height: "auto", padding: 8, resize: "vertical" }} placeholder="Opcional..." />
                </div>
                <div style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-soft-2)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#7a4a36", display: "flex", alignItems: "center", gap: 8 }}>
                  <AdminIcon name="info" size={14} />
                  Após confirmar, o estoque passa para <b>&nbsp;{(entryFor.current + 20).toLocaleString("pt-BR")} {entryFor.unit}</b>.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setEntryFor(null)}>Cancelar</button>
              <button className="btn primary" id="btn-confirmar-entrada" onClick={() => setEntryFor(null)}>
                <AdminIcon name="check" size={12} /> Confirmar entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
