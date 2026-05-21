"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type Cliente = {
  name: string; type: "varejo" | "atacado"; contact: string; phone: string
  city: string; orders: number; total: string; lastOrder: string
}

const clientes: Cliente[] = [
  { name: "Boutique Lis", type: "atacado", contact: "Maria Lis", phone: "(31) 9 9988-1122", city: "Belo Horizonte/MG", orders: 12, total: "R$ 38.420,00", lastOrder: "08/05/2026" },
  { name: "Marina Souza", type: "varejo", contact: "—", phone: "(21) 9 8821-4477", city: "Rio de Janeiro/RJ", orders: 4, total: "R$ 1.240,00", lastOrder: "08/05/2026" },
  { name: "Ateliê Coimbra", type: "atacado", contact: "Júlia Coimbra", phone: "(41) 9 9712-3344", city: "Curitiba/PR", orders: 8, total: "R$ 26.180,00", lastOrder: "07/05/2026" },
  { name: "Camila Ferreira", type: "varejo", contact: "—", phone: "(31) 9 8744-2218", city: "Belo Horizonte/MG", orders: 7, total: "R$ 2.180,00", lastOrder: "08/05/2026" },
  { name: "Loja Flora SP", type: "atacado", contact: "Marcela Flora", phone: "(11) 9 8866-2244", city: "São Paulo/SP", orders: 5, total: "R$ 18.240,00", lastOrder: "06/05/2026" },
  { name: "Renata Lopes", type: "varejo", contact: "—", phone: "(11) 9 7733-9911", city: "São Paulo/SP", orders: 3, total: "R$ 1.420,00", lastOrder: "08/05/2026" },
  { name: "Ponto da Bolsa", type: "atacado", contact: "Eliana Pinto", phone: "(51) 9 9911-7788", city: "Porto Alegre/RS", orders: 6, total: "R$ 32.880,00", lastOrder: "04/05/2026" },
  { name: "Júlia Andrade", type: "varejo", contact: "—", phone: "(48) 9 9421-1818", city: "Florianópolis/SC", orders: 2, total: "R$ 530,00", lastOrder: "07/05/2026" },
  { name: "Coquetel Acessórios", type: "atacado", contact: "Beatriz Sá", phone: "(21) 9 9421-1212", city: "Rio de Janeiro/RJ", orders: 3, total: "R$ 6.080,00", lastOrder: "02/05/2026" },
  { name: "Patrícia Nogueira", type: "varejo", contact: "—", phone: "(61) 9 8123-4521", city: "Brasília/DF", orders: 5, total: "R$ 3.240,00", lastOrder: "06/05/2026" },
]

const recentOrders = ["V-2841 · 08/05 · R$ 320,00 · Pago", "V-2820 · 02/05 · R$ 189,90 · Enviado", "V-2799 · 21/04 · R$ 410,00 · Pago"]

export default function ClientesPage() {
  const [tab, setTab] = useState<"todos" | "varejo" | "atacado">("todos")
  const [selected, setSelected] = useState<Cliente | null>(null)

  const counts = {
    todos: clientes.length,
    varejo: clientes.filter(c => c.type === "varejo").length,
    atacado: clientes.filter(c => c.type === "atacado").length,
  }

  const filtered = tab === "todos" ? clientes : clientes.filter(c => c.type === tab)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Clientes</h2>
          <p className="page-sub">{clientes.length} cadastrados · {counts.atacado} atacadistas · {counts.varejo} varejo</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-novo-cliente"><AdminIcon name="plus" /> Novo cliente</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "todos" ? "active" : ""}`} onClick={() => setTab("todos")}>Todos <span className="count">{counts.todos}</span></button>
        <button className={`tab ${tab === "varejo" ? "active" : ""}`} onClick={() => setTab("varejo")}>Varejo <span className="count">{counts.varejo}</span></button>
        <button className={`tab ${tab === "atacado" ? "active" : ""}`} onClick={() => setTab("atacado")}>Atacado <span className="count">{counts.atacado}</span></button>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="row" style={{ flex: 1, gap: 8 }}>
            <div className="search-input" style={{ width: 280 }}>
              <AdminIcon name="search" size={13} />
              <input placeholder="Buscar por nome, telefone, cidade..." />
            </div>
            <select className="select" style={{ width: "auto" }}>
              <option>Todas as cidades</option>
              <option>São Paulo/SP</option>
              <option>Rio de Janeiro/RJ</option>
            </select>
            <button className="btn ghost"><AdminIcon name="filter" /> Mais filtros</button>
          </div>
          <span className="cust-meta">Ordenar por: <b style={{ color: "var(--text)" }}>Maior receita</b></span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th style={{ width: 90 }}>Tipo</th>
                  <th>Contato</th>
                  <th style={{ width: 140 }}>Cidade/UF</th>
                  <th style={{ width: 80 }}>Pedidos</th>
                  <th style={{ width: 130 }}>Total comprado</th>
                  <th style={{ width: 120 }}>Último pedido</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div className="thumb" style={{
                          width: 26, height: 26, fontSize: 10,
                          background: c.type === "atacado" ? "linear-gradient(135deg,#d8c89a,#a08956)" : "linear-gradient(135deg,#c9b6c9,#8b6b8b)",
                          color: "#fff"
                        }}>
                          {c.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                        </div>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.type === "atacado" ? "atacado" : "varejo"}`}>
                        {c.type === "atacado" ? "Atacado" : "Varejo"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{c.contact !== "—" ? c.contact : <span className="cust-meta">—</span>}</div>
                      <div className="cust-meta tiny">{c.phone}</div>
                    </td>
                    <td className="cust-meta">{c.city}</td>
                    <td className="num">{c.orders}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{c.total}</td>
                    <td className="cust-meta">{c.lastOrder}</td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                        <button className="btn sm ghost" onClick={() => setSelected(c)}><AdminIcon name="eye" size={11} /> Ver</button>
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

      <div className={`drawer-backdrop ${selected ? "open" : ""}`} onClick={() => setSelected(null)} />
      <div className={`drawer ${selected ? "open" : ""}`}>
        <div className="drawer-header">
          <div>
            <h3>{selected?.name}</h3>
            <div className="cust-meta">{selected?.type === "atacado" ? "Cliente atacado" : "Cliente varejo"} · desde 2024</div>
          </div>
          <button className="icon-btn" onClick={() => setSelected(null)}><AdminIcon name="x" size={14} /></button>
        </div>
        <div className="drawer-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div className="kpi" style={{ padding: 12 }}>
              <div className="kpi-label">Total comprado</div>
              <div className="kpi-value" style={{ fontSize: 20 }}>{selected?.total}</div>
            </div>
            <div className="kpi" style={{ padding: 12 }}>
              <div className="kpi-label">Pedidos</div>
              <div className="kpi-value" style={{ fontSize: 20 }}>{selected?.orders}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field"><label>Telefone</label><input className="input" defaultValue={selected?.phone ?? ""} /></div>
            <div className="field"><label>E-mail</label><input className="input" defaultValue={selected?.type === "atacado" ? "contato@boutique.com.br" : "cliente@email.com"} /></div>
            <div className="field"><label>Cidade / UF</label><input className="input" defaultValue={selected?.city ?? ""} /></div>
            <div className="field">
              <label>Endereço</label>
              <textarea className="input" rows={2} style={{ height: "auto", padding: 8, resize: "vertical" }} defaultValue="Rua das Laranjeiras, 482 · CEP 22240-006" />
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="cust-meta" style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.05em", marginBottom: 8 }}>
              Últimos pedidos
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {recentOrders.map((s, i) => (
                <div key={i} style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6, fontSize: 12, fontFamily: "ui-monospace, monospace", color: "var(--text-2)" }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn ghost" onClick={() => setSelected(null)}>Fechar</button>
          <button className="btn primary">Salvar</button>
        </div>
      </div>
    </div>
  )
}
