"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type Fornecedor = {
  name: string; cnpj: string; contact: string; phone: string; email: string
  city: string; materials: string[]; totalBought: string; rating: number
}

const fornecedores: Fornecedor[] = [
  {
    name: "Curtume Vargas", cnpj: "12.345.678/0001-99", contact: "Roberto Vargas", phone: "(51) 3322-8800",
    email: "vendas@curtume-vargas.com.br", city: "Porto Alegre/RS",
    materials: ["Couro Legítimo Marrom", "Couro Legítimo Caramelo", "Couro Legítimo Preto", "Alça de Couro 80cm"],
    totalBought: "R$ 24.680,00", rating: 5,
  },
  {
    name: "Tecidos São Paulo", cnpj: "98.765.432/0001-11", contact: "Ana Ferreira", phone: "(11) 2233-4455",
    email: "contato@tecidosp.com.br", city: "São Paulo/SP",
    materials: ["Forro Algodão Bege", "Linho Cru 1,40m"],
    totalBought: "R$ 6.420,00", rating: 4,
  },
  {
    name: "Metal Acessórios SP", cnpj: "45.678.901/0001-22", contact: "Carlos Mota", phone: "(11) 4455-6677",
    email: "vendas@metalacessorios.com.br", city: "São Paulo/SP",
    materials: ["Fivela Metal Dourado P", "Fivela Metal Dourado M"],
    totalBought: "R$ 3.184,00", rating: 4,
  },
  {
    name: "Linhas Veneza", cnpj: "33.221.100/0001-44", contact: "Silvia Veneza", phone: "(41) 3344-5566",
    email: "pedidos@linhasveneza.com.br", city: "Curitiba/PR",
    materials: ["Linha Algodão Encerada"],
    totalBought: "R$ 1.260,00", rating: 3,
  },
  {
    name: "Etiquetas Bordadas Cia.", cnpj: "77.889.900/0001-55", contact: "Fernanda Lima", phone: "(31) 9 9812-3344",
    email: "fernanda@etiquetascia.com.br", city: "Belo Horizonte/MG",
    materials: ["Etiqueta Marca PC"],
    totalBought: "R$ 2.610,00", rating: 5,
  },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div className="row" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill={i <= rating ? "#f59e0b" : "var(--border-strong)"}>
          <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8l-2.78 1.55.53-3.1L1.5 4.25l3.1-.45z" />
        </svg>
      ))}
    </div>
  )
}

type DrawerMode = "view" | "new"

export default function FornecedoresPage() {
  const [selected, setSelected] = useState<Fornecedor | null>(null)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view")
  const [linkedMaterials, setLinkedMaterials] = useState([
    { material: "Couro Legítimo Marrom", unit: "m²", cost: "R$ 78,00" },
  ])

  const openNew = () => { setSelected(null); setDrawerMode("new") }
  const openView = (f: Fornecedor) => { setSelected(f); setDrawerMode("view") }
  const closeDrawer = () => { setSelected(null); setDrawerMode("view") }
  const drawerOpen = selected !== null || drawerMode === "new"

  const addMaterial = () => setLinkedMaterials(prev => [...prev, { material: "", unit: "m²", cost: "" }])
  const removeMaterial = (i: number) => setLinkedMaterials(prev => prev.filter((_, idx) => idx !== i))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Fornecedores</h2>
          <p className="page-sub">{fornecedores.length} cadastrados · {fornecedores.reduce((acc, f) => acc + f.materials.length, 0)} matérias-primas vinculadas</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-novo-fornecedor" onClick={openNew}>
            <AdminIcon name="plus" /> Novo fornecedor
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="row" style={{ flex: 1, gap: 8 }}>
            <div className="search-input" style={{ width: 280 }}>
              <AdminIcon name="search" size={13} />
              <input placeholder="Buscar por nome, CNPJ, cidade..." />
            </div>
            <select className="select" style={{ width: "auto" }}>
              <option>Todos os estados</option>
              <option>São Paulo/SP</option>
              <option>Porto Alegre/RS</option>
            </select>
          </div>
          <span className="cust-meta">Ordenar por: <b style={{ color: "var(--text)" }}>Maior volume</b></span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th style={{ width: 150 }}>CNPJ</th>
                  <th>Matérias-primas</th>
                  <th style={{ width: 140 }}>Cidade/UF</th>
                  <th style={{ width: 130 }}>Total comprado</th>
                  <th style={{ width: 90 }}>Avaliação</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f, i) => (
                  <tr key={i}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div className="thumb" style={{
                          width: 28, height: 28, fontSize: 11, borderRadius: 6,
                          background: "linear-gradient(135deg,#d8c89a,#a08956)", color: "#fff"
                        }}>
                          {f.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{f.name}</div>
                          <div className="cust-meta tiny">{f.contact} · {f.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cust-meta" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}>{f.cnpj}</td>
                    <td>
                      <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
                        {f.materials.slice(0, 3).map((m, mi) => (
                          <span key={mi} className="chip">{m}</span>
                        ))}
                        {f.materials.length > 3 && (
                          <span className="chip" style={{ color: "var(--text-3)" }}>+{f.materials.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="cust-meta">{f.city}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{f.totalBought}</td>
                    <td><Stars rating={f.rating} /></td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                        <button className="btn sm ghost" onClick={() => openView(f)} id={`btn-ver-fornecedor-${i}`}>
                          <AdminIcon name="eye" size={11} /> Ver
                        </button>
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

      {/* Backdrop */}
      <div className={`drawer-backdrop ${drawerOpen ? "open" : ""}`} onClick={closeDrawer} />

      {/* View Drawer */}
      <div className={`drawer ${drawerOpen && drawerMode === "view" ? "open" : ""}`} style={{ width: 520 }}>
        {selected && (
          <>
            <div className="drawer-header">
              <div>
                <h3>{selected.name}</h3>
                <div className="cust-meta">{selected.city} · <Stars rating={selected.rating} /></div>
              </div>
              <button className="icon-btn" onClick={closeDrawer}><AdminIcon name="x" size={14} /></button>
            </div>
            <div className="drawer-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Total comprado</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{selected.totalBought}</div>
                </div>
                <div className="kpi" style={{ padding: 12 }}>
                  <div className="kpi-label">Materiais vinculados</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{selected.materials.length}</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field"><label>Nome</label><input className="input" defaultValue={selected.name} /></div>
                  <div className="field"><label>CNPJ</label><input className="input" defaultValue={selected.cnpj} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field"><label>Contato</label><input className="input" defaultValue={selected.contact} /></div>
                  <div className="field"><label>Telefone</label><input className="input" defaultValue={selected.phone} /></div>
                </div>
                <div className="field"><label>E-mail</label><input className="input" defaultValue={selected.email} /></div>
                <div className="field"><label>Cidade / UF</label><input className="input" defaultValue={selected.city} /></div>
              </div>

              <div>
                <div className="cust-meta" style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.05em", marginBottom: 8 }}>
                  Matérias-primas fornecidas
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  {selected.materials.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--surface-2)", borderRadius: 5, fontSize: 12.5 }}>
                      <div className="thumb mat" style={{ width: 20, height: 20 }}>
                        <AdminIcon name="layers" size={10} />
                      </div>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button className="btn ghost" onClick={closeDrawer}>Fechar</button>
              <button className="btn primary" id="btn-salvar-fornecedor">Salvar</button>
            </div>
          </>
        )}
      </div>

      {/* New Fornecedor Drawer */}
      <div className={`drawer ${drawerOpen && drawerMode === "new" ? "open" : ""}`} style={{ width: 560 }}>
        <div className="drawer-header">
          <div>
            <h3>Novo Fornecedor</h3>
            <div className="cust-meta">Preencha os dados e vincule as matérias-primas</div>
          </div>
          <button className="icon-btn" onClick={closeDrawer}><AdminIcon name="x" size={14} /></button>
        </div>
        <div className="drawer-body">
          <div style={{ marginBottom: 20 }}>
            <div className="cust-meta" style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.05em", marginBottom: 12 }}>
              Dados cadastrais
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field"><label>Razão social / Nome</label><input className="input" placeholder="Ex.: Curtume Vargas" /></div>
                <div className="field"><label>CNPJ</label><input className="input" placeholder="00.000.000/0001-00" /></div>
              </div>
              <div className="field"><label>Cidade / UF</label><input className="input" placeholder="Porto Alegre/RS" /></div>
              <div className="field">
                <label>Endereço</label>
                <textarea className="input" rows={2} style={{ height: "auto", padding: 8, resize: "vertical" }} placeholder="Rua, número, bairro, CEP..." />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="cust-meta" style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.05em", marginBottom: 12 }}>
              Contato
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field"><label>Nome do contato</label><input className="input" placeholder="Ex.: Roberto Vargas" /></div>
                <div className="field"><label>Telefone</label><input className="input" placeholder="(51) 3322-8800" /></div>
              </div>
              <div className="field"><label>E-mail</label><input className="input" placeholder="vendas@fornecedor.com.br" /></div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="cust-meta" style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.05em" }}>
                Matérias-primas fornecidas
              </div>
              <button className="linkish" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }} onClick={addMaterial}>
                <AdminIcon name="plus" size={11} /> Adicionar
              </button>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {linkedMaterials.map((lm, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 32px", gap: 6, alignItems: "center" }}>
                  <input className="input" placeholder="Nome do material" defaultValue={lm.material} />
                  <select className="select">
                    <option>m²</option>
                    <option>m</option>
                    <option>un</option>
                    <option>kg</option>
                  </select>
                  <input className="input" placeholder="Custo/un." defaultValue={lm.cost} />
                  <button className="icon-btn" onClick={() => removeMaterial(i)}>
                    <AdminIcon name="x" size={12} />
                  </button>
                </div>
              ))}
              {linkedMaterials.length === 0 && (
                <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: 6, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
                  Nenhum material vinculado. Clique em Adicionar.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn ghost" onClick={closeDrawer}>Cancelar</button>
          <button className="btn primary" id="btn-confirmar-fornecedor" onClick={closeDrawer}>
            <AdminIcon name="check" size={12} /> Cadastrar fornecedor
          </button>
        </div>
      </div>
    </div>
  )
}
