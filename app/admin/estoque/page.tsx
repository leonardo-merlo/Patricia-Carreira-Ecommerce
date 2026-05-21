"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type Variant = { sku: string; size: string; color: string; qty: number }
type Product = {
  name: string; cat: string; thumb: string
  price: string; wholesale: string; active: boolean
  variants: Variant[]
}

const products: Product[] = [
  {
    name: "Bolsa Tiracolo Couro", cat: "Bolsas", thumb: "bag",
    price: "R$ 320,00", wholesale: "R$ 192,00", active: true,
    variants: [
      { sku: "BTC-PRT-P", size: "P", color: "Preto", qty: 14 },
      { sku: "BTC-PRT-M", size: "M", color: "Preto", qty: 9 },
      { sku: "BTC-MAR-M", size: "M", color: "Marrom", qty: 2 },
      { sku: "BTC-CAR-M", size: "M", color: "Caramelo", qty: 0 },
    ],
  },
  {
    name: "Bolsa Carteira Pequena", cat: "Bolsas", thumb: "bag",
    price: "R$ 189,90", wholesale: "R$ 114,00", active: true,
    variants: [
      { sku: "BCP-OFF-U", size: "Único", color: "Off-White", qty: 22 },
      { sku: "BCP-PRT-U", size: "Único", color: "Preto", qty: 18 },
    ],
  },
  {
    name: "Vestido Linho Midi", cat: "Roupas", thumb: "cloth",
    price: "R$ 410,00", wholesale: "R$ 246,00", active: true,
    variants: [
      { sku: "VLM-CRU-P", size: "P", color: "Cru", qty: 8 },
      { sku: "VLM-CRU-M", size: "M", color: "Cru", qty: 12 },
      { sku: "VLM-CRU-G", size: "G", color: "Cru", qty: 5 },
      { sku: "VLM-VRD-M", size: "M", color: "Verde Sálvia", qty: 0 },
      { sku: "VLM-VRD-G", size: "G", color: "Verde Sálvia", qty: 1 },
    ],
  },
  {
    name: "Cinto Trançado", cat: "Acessórios", thumb: "acc",
    price: "R$ 145,00", wholesale: "R$ 87,00", active: false,
    variants: [
      { sku: "CTR-CAR-U", size: "Único", color: "Caramelo", qty: 0 },
      { sku: "CTR-PRT-U", size: "Único", color: "Preto", qty: 11 },
    ],
  },
  {
    name: "Bolsa Saco Nylon", cat: "Bolsas", thumb: "bag",
    price: "R$ 268,00", wholesale: "R$ 161,00", active: true,
    variants: [
      { sku: "BSN-OFF-U", size: "Único", color: "Off-White", qty: 4 },
      { sku: "BSN-PRT-U", size: "Único", color: "Preto", qty: 16 },
      { sku: "BSN-VER-U", size: "Único", color: "Verde Oliva", qty: 7 },
    ],
  },
  {
    name: "Brinco Argola Banhada", cat: "Acessórios", thumb: "acc",
    price: "R$ 89,00", wholesale: "R$ 53,00", active: true,
    variants: [
      { sku: "BAB-DOU-U", size: "Único", color: "Dourado", qty: 34 },
      { sku: "BAB-PRT-U", size: "Único", color: "Prata", qty: 28 },
    ],
  },
]

function stockBadge(qty: number, min = 5) {
  if (qty === 0) return <span className="badge esgotado"><AdminIcon name="xCircle" size={11} /> Esgotado</span>
  if (qty < min) return <span className="badge baixo"><AdminIcon name="alert" size={11} /> Baixo</span>
  return <span className="stock-num ok">{qty}</span>
}

export default function EstoquePage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0, 2]))
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null)

  const toggle = (i: number) => {
    const s = new Set(expanded)
    s.has(i) ? s.delete(i) : s.add(i)
    setExpanded(s)
  }

  const totalVariants = products.reduce((a, p) => a + p.variants.length, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Gestão de Estoque</h2>
          <p className="page-sub">{products.length} produtos · {totalVariants} variantes ativas</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          <button className="btn primary" id="btn-novo-produto"><AdminIcon name="plus" /> Novo produto</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 12 }}>
          <div className="row" style={{ flex: 1, gap: 8 }}>
            <div className="search-input" style={{ width: 280 }}>
              <AdminIcon name="search" size={13} />
              <input placeholder="Buscar por nome ou SKU..." />
            </div>
            <select className="select" style={{ width: "auto" }}>
              <option>Todas as categorias</option>
              <option>Bolsas</option>
              <option>Roupas</option>
              <option>Acessórios</option>
            </select>
            <select className="select" style={{ width: "auto" }}>
              <option>Todos os status</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
            <button className="btn ghost"><AdminIcon name="filter" /> Mais filtros</button>
          </div>
          <span className="chip">{products.length} produtos</span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Produto</th>
                  <th style={{ width: 110 }}>Categoria</th>
                  <th style={{ width: 110 }}>Variantes</th>
                  <th style={{ width: 110 }}>Preço varejo</th>
                  <th style={{ width: 110 }}>Atacado</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 100 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <>
                    <tr key={`prod-${i}`} className={expanded.has(i) ? "expanded" : ""}>
                      <td>
                        <button className="icon-btn" onClick={() => toggle(i)} aria-label="Expandir">
                          <AdminIcon name={expanded.has(i) ? "chevDown" : "chevRight"} size={12} />
                        </button>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <div className={`thumb ${p.thumb}`}>
                            <AdminIcon name={p.cat === "Bolsas" ? "bag" : p.cat === "Roupas" ? "tag" : "sparkles"} size={14} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{p.name}</div>
                            <div className="cust-meta">
                              {p.variants.length} variantes · {p.variants.reduce((a, v) => a + v.qty, 0)} unid.
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{p.cat}</span></td>
                      <td className="num">{p.variants.length}</td>
                      <td className="num">{p.price}</td>
                      <td className="num subtle">{p.wholesale}</td>
                      <td><span className={`switch ${p.active ? "on" : ""}`} /></td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                          <button className="icon-btn" onClick={() => setDrawerProduct(p)} title="Editar">
                            <AdminIcon name="edit" size={13} />
                          </button>
                          <button className="icon-btn" title="Mais">
                            <AdminIcon name="moreH" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded.has(i) && p.variants.map((v, j) => (
                      <tr className="child" key={`var-${i}-${j}`}>
                        <td></td>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}>{v.sku}</span>
                            <span style={{ color: "var(--text)" }}>{v.color}</span>
                          </div>
                        </td>
                        <td className="cust-meta">Tamanho {v.size}</td>
                        <td className="num">{stockBadge(v.qty)}</td>
                        <td colSpan={2} className="cust-meta">SKU: {v.sku}</td>
                        <td></td>
                        <td>
                          <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                            <button className="btn sm ghost"><AdminIcon name="plus" size={11} /> Estoque</button>
                            <button className="btn sm ghost">Editar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`drawer-backdrop ${drawerProduct ? "open" : ""}`} onClick={() => setDrawerProduct(null)} />
      <div className={`drawer ${drawerProduct ? "open" : ""}`}>
        <div className="drawer-header">
          <div>
            <h3>Editar produto</h3>
            <div className="cust-meta">{drawerProduct?.name}</div>
          </div>
          <button className="icon-btn" onClick={() => setDrawerProduct(null)}>
            <AdminIcon name="x" size={14} />
          </button>
        </div>
        <div className="drawer-body">
          <div style={{
            border: "1.5px dashed var(--border-strong)",
            borderRadius: 8,
            background: "var(--surface-2)",
            padding: "32px 16px",
            textAlign: "center",
            color: "var(--text-2)",
            marginBottom: 18,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 8, margin: "0 auto 8px", background: "linear-gradient(135deg,#d4b29a,#a87b5e)", display: "grid", placeItems: "center", color: "#fff" }}>
              <AdminIcon name="image" size={20} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Arraste imagens ou clique</div>
            <div className="cust-meta">PNG, JPG até 4MB · Recomendado 1200×1200</div>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="field">
              <label>Nome do produto</label>
              <input className="input" defaultValue={drawerProduct?.name ?? ""} />
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea className="input" rows={3} style={{ height: "auto", padding: 8, resize: "vertical" }}
                defaultValue="Bolsa tiracolo em couro legítimo com forro de algodão, fivela metálica dourada e alça regulável." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field">
                <label>Preço varejo</label>
                <input className="input" defaultValue={drawerProduct?.price ?? ""} />
              </div>
              <div className="field">
                <label>Preço atacado</label>
                <input className="input" defaultValue={drawerProduct?.wholesale ?? ""} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field">
                <label>Categoria</label>
                <select className="select" defaultValue={drawerProduct?.cat ?? "Bolsas"}>
                  <option>Bolsas</option><option>Roupas</option><option>Acessórios</option>
                </select>
              </div>
              <div className="field">
                <label>Estoque mínimo</label>
                <input className="input" defaultValue="5" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 12.5 }}>Ativo no e-commerce</div>
                <div className="cust-meta">Visível na loja online</div>
              </div>
              <span className="switch on" />
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn ghost" onClick={() => setDrawerProduct(null)}>Cancelar</button>
          <button className="btn primary" id="btn-salvar-produto">Salvar alterações</button>
        </div>
      </div>
    </div>
  )
}
