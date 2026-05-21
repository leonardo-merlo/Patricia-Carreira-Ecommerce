"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type OrderStatus = "pago" | "pendente" | "producao" | "enviado" | "cancelado"

const STATUS: Record<OrderStatus, { cls: string; txt: string }> = {
  pago: { cls: "pago", txt: "Pago" },
  pendente: { cls: "pendente", txt: "Pendente" },
  producao: { cls: "producao", txt: "Em Produção" },
  enviado: { cls: "enviado", txt: "Enviado" },
  cancelado: { cls: "cancelado", txt: "Cancelado" },
}

const varejo = [
  { num: "V-2841", date: "08/05", cust: "Marina Souza", city: "Rio de Janeiro/RJ", items: 2, total: "R$ 320,00", payment: "Pix", status: "pago" as OrderStatus },
  { num: "V-2840", date: "08/05", cust: "Camila Ferreira", city: "Belo Horizonte/MG", items: 1, total: "R$ 189,90", payment: "Cartão 3x", status: "enviado" as OrderStatus },
  { num: "V-2839", date: "08/05", cust: "Renata Lopes", city: "São Paulo/SP", items: 3, total: "R$ 540,00", payment: "Boleto", status: "pendente" as OrderStatus },
  { num: "V-2838", date: "07/05", cust: "Júlia Andrade", city: "Florianópolis/SC", items: 2, total: "R$ 268,00", payment: "Pix", status: "enviado" as OrderStatus },
  { num: "V-2837", date: "07/05", cust: "Beatriz Mendes", city: "Salvador/BA", items: 2, total: "R$ 410,00", payment: "Cartão 1x", status: "pago" as OrderStatus },
  { num: "V-2836", date: "07/05", cust: "Ana Paula Vieira", city: "Curitiba/PR", items: 1, total: "R$ 145,00", payment: "Pix", status: "enviado" as OrderStatus },
  { num: "V-2835", date: "06/05", cust: "Larissa Antunes", city: "Recife/PE", items: 1, total: "R$ 89,00", payment: "Cartão 2x", status: "cancelado" as OrderStatus },
  { num: "V-2834", date: "06/05", cust: "Patrícia Nogueira", city: "Brasília/DF", items: 4, total: "R$ 968,00", payment: "Boleto", status: "pago" as OrderStatus },
]

const atacado = [
  { num: "A-118", date: "08/05", cust: "Boutique Lis", contact: "Maria Lis · (31) 9 9988-1122", cnpj: "12.345.678/0001-90", items: 38, total: "R$ 4.890,00", op: "OP #042", status: "producao" as OrderStatus },
  { num: "A-117", date: "07/05", cust: "Ateliê Coimbra", contact: "Júlia Coimbra · (41) 9 9712-3344", cnpj: "33.221.118/0001-22", items: 52, total: "R$ 7.220,00", op: "OP #041", status: "pago" as OrderStatus },
  { num: "A-116", date: "06/05", cust: "Loja Flora SP", contact: "Marcela Flora · (11) 9 8866-2244", cnpj: "08.776.554/0001-11", items: 24, total: "R$ 3.180,00", op: "OP #040", status: "producao" as OrderStatus },
  { num: "A-115", date: "04/05", cust: "Ponto da Bolsa", contact: "Eliana Pinto · (51) 9 9911-7788", cnpj: "44.112.998/0001-55", items: 60, total: "R$ 8.640,00", op: "—", status: "enviado" as OrderStatus },
  { num: "A-114", date: "02/05", cust: "Coquetel Acessórios", contact: "Beatriz Sá · (21) 9 9421-1212", cnpj: "55.998.227/0001-08", items: 18, total: "R$ 1.962,00", op: "—", status: "pago" as OrderStatus },
]

const orderItems = [
  { name: "Bolsa Carteira Pequena Off-White — Único", sku: "BCP-OFF-U", qty: 1, price: "R$ 189,90" },
  { name: "Brinco Argola Banhada Dourado", sku: "BAB-DOU-U", qty: 1, price: "R$ 89,00" },
]

type StockCheck = "success" | "partial" | "fail" | null

const newOrderItems = [
  { product: "Bolsa Tiracolo Couro Marrom — M", sku: "BTC-MAR-M", qty: 60, unit: "R$ 192,00", subtotal: "R$ 11.520,00", stock: { kind: "fail", text: "Apenas 2 em estoque" } },
  { product: "Bolsa Carteira Pequena Off-White — Único", sku: "BCP-OFF-U", qty: 30, unit: "R$ 114,00", subtotal: "R$ 3.420,00", stock: { kind: "warn", text: "22 em estoque · faltam 8" } },
  { product: "Cinto Trançado Preto — Único", sku: "CTR-PRT-U", qty: 10, unit: "R$ 87,00", subtotal: "R$ 870,00", stock: { kind: "ok", text: "11 em estoque" } },
]

function NovoAtacado({ onCancel }: { onCancel: () => void }) {
  const [stockCheck, setStockCheck] = useState<StockCheck>(null)

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      <div className="page-header">
        <div>
          <div className="cust-meta" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <button className="linkish" onClick={onCancel}>Pedidos</button>
            <AdminIcon name="chevRight" size={11} />
            <span>Atacado</span>
            <AdminIcon name="chevRight" size={11} />
            <span>Novo</span>
          </div>
          <h2 className="page-title">Novo pedido atacado</h2>
          <p className="page-sub">Cadastre cliente, itens e verifique disponibilidade antes de confirmar.</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn">Salvar como rascunho</button>
          <button className="btn primary" id="btn-confirmar-pedido-atacado">Confirmar pedido</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--gap)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <div className="card">
            <div className="card-header">
              <h3 className="ttl">Cliente</h3>
              <button className="linkish"><AdminIcon name="plus" size={11} /> Novo cliente</button>
            </div>
            <div className="card-body">
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Buscar cliente atacadista</label>
                <div className="search-input" style={{ width: "100%" }}>
                  <AdminIcon name="search" size={13} />
                  <input placeholder="Nome ou CNPJ..." defaultValue="Boutique Lis" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="field"><label>Razão social</label><input className="input" defaultValue="Boutique Lis Comércio Ltda." /></div>
                <div className="field"><label>CNPJ</label><input className="input" defaultValue="12.345.678/0001-90" /></div>
                <div className="field"><label>Telefone</label><input className="input" defaultValue="(31) 9 9988-1122" /></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="ttl">Itens do pedido</h3>
              <button className="btn sm primary" id="btn-adicionar-item-op"><AdminIcon name="plus" size={11} /> Adicionar item</button>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Produto / Variante</th>
                    <th style={{ width: 90 }}>Qtd.</th>
                    <th style={{ width: 110 }}>Preço unit.</th>
                    <th style={{ width: 130 }}>Subtotal</th>
                    <th style={{ width: 180 }}>Estoque</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {newOrderItems.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <div className="thumb bag" style={{ width: 26, height: 26 }}><AdminIcon name="bag" size={12} /></div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{it.product}</div>
                            <div className="cust-meta tiny">{it.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td><input className="input" defaultValue={it.qty} style={{ width: 70, height: 26, padding: "2px 8px" }} /></td>
                      <td><input className="input" defaultValue={it.unit} style={{ width: 100, height: 26, padding: "2px 8px" }} /></td>
                      <td className="num" style={{ fontWeight: 500 }}>{it.subtotal}</td>
                      <td>
                        {it.stock.kind === "ok" && <span style={{ color: "var(--green)", fontSize: 11.5, display: "inline-flex", gap: 4, alignItems: "center" }}><AdminIcon name="checkCircle" size={11} />{it.stock.text}</span>}
                        {it.stock.kind === "warn" && <span style={{ color: "var(--yellow)", fontSize: 11.5, display: "inline-flex", gap: 4, alignItems: "center" }}><AdminIcon name="alert" size={11} />{it.stock.text}</span>}
                        {it.stock.kind === "fail" && <span style={{ color: "var(--red)", fontSize: 11.5, display: "inline-flex", gap: 4, alignItems: "center" }}><AdminIcon name="xCircle" size={11} />{it.stock.text}</span>}
                      </td>
                      <td><button className="icon-btn"><AdminIcon name="x" size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="ttl">Observações</h3></div>
            <div className="card-body">
              <textarea className="input" rows={3} style={{ height: "auto", padding: 10, resize: "vertical", width: "100%" }}
                defaultValue="Embalar com tag personalizada da Boutique Lis. Prazo combinado: 18 dias úteis." />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", position: "sticky", top: 78, alignSelf: "flex-start" }}>
          <div className="card">
            <div className="card-header"><h3 className="ttl">Resumo</h3></div>
            <div className="card-body" style={{ display: "grid", gap: 10, fontSize: 12.5 }}>
              <div className="row between"><span className="cust-meta">Itens</span><span className="num">3 SKUs · 100 un.</span></div>
              <div className="row between"><span className="cust-meta">Subtotal</span><span className="num">R$ 15.810,00</span></div>
              <div className="row between"><span className="cust-meta">Desconto</span><span className="num" style={{ color: "var(--green)" }}>−R$ 0,00</span></div>
              <div className="row between"><span className="cust-meta">Frete</span><span className="num">A combinar</span></div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div className="row between" style={{ fontSize: 14, fontWeight: 600 }}>
                  <span>Total</span><span>R$ 15.810,00</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <div className="card-header">
              <h3 className="ttl">Verificação de disponibilidade</h3>
            </div>

            {!stockCheck && (
              <div className="card-body">
                <p className="cust-meta" style={{ marginTop: 0 }}>Verifica estoque atual e necessidade de produção antes de confirmar.</p>
                <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStockCheck("partial")}>
                  <AdminIcon name="checkCircle" size={12} /> Verificar disponibilidade
                </button>
              </div>
            )}

            {stockCheck === "partial" && (
              <>
                <div style={{ background: "var(--yellow-soft)", borderTop: "1px solid #ecdcb0", padding: "14px 16px", display: "flex", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 14, background: "var(--yellow)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <AdminIcon name="alert" size={14} />
                  </div>
                  <div style={{ fontSize: 12.5, color: "#7a5610" }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Disponibilidade parcial</div>
                    <div>33 de 100 unidades em estoque. Necessário produzir <b>67 unidades</b>.</div>
                  </div>
                </div>
                <div className="card-body" style={{ padding: 14, display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-2)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>Itens a produzir</div>
                  <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                    <div className="row between"><span>Bolsa Tiracolo Couro Marrom — M</span><span className="num">58 un.</span></div>
                    <div className="row between"><span>Bolsa Carteira Pequena Off-White</span><span className="num">8 un.</span></div>
                  </div>
                  <button className="btn primary" style={{ marginTop: 6, width: "100%", justifyContent: "center" }} id="btn-criar-op-automatica">
                    <AdminIcon name="factory" size={12} /> Criar OP para 66 unidades
                  </button>
                  <button className="btn ghost" style={{ width: "100%", justifyContent: "center" }}>Confirmar mesmo sem produção</button>
                </div>
              </>
            )}

            {stockCheck === "success" && (
              <div style={{ background: "var(--green-soft)", borderTop: "1px solid #cbe7d4", padding: "14px 16px", display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: "var(--green)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <AdminIcon name="check" size={14} />
                </div>
                <div style={{ fontSize: 12.5, color: "#175a32" }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Estoque suficiente</div>
                  <div>100 unidades disponíveis. Pode confirmar sem nova produção.</div>
                </div>
              </div>
            )}

            {stockCheck && (
              <div className="card-body" style={{ padding: "8px 16px", borderTop: "1px solid var(--border)" }}>
                <button className="linkish" style={{ fontSize: 11 }} onClick={() => setStockCheck(null)}>
                  ↺ Reverificar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PedidosPage() {
  const [tab, setTab] = useState<"varejo" | "atacado">("varejo")
  const [view, setView] = useState<"list" | "new">("list")
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  if (view === "new") return <NovoAtacado onCancel={() => setView("list")} />

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Pedidos</h2>
          <p className="page-sub">{varejo.length} pedidos varejo · {atacado.length} pedidos atacado em maio</p>
        </div>
        <div className="page-actions">
          <button className="btn"><AdminIcon name="download" /> Exportar</button>
          {tab === "atacado" && (
            <button className="btn primary" id="btn-novo-pedido-atacado" onClick={() => setView("new")}>
              <AdminIcon name="plus" /> Novo pedido atacado
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "varejo" ? "active" : ""}`} onClick={() => setTab("varejo")}>
          <AdminIcon name="cart" size={13} /> Varejo (E-commerce) <span className="count">{varejo.length}</span>
        </button>
        <button className={`tab ${tab === "atacado" ? "active" : ""}`} onClick={() => setTab("atacado")}>
          <AdminIcon name="truck" size={13} /> Atacado (Manual) <span className="count">{atacado.length}</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, flex: 1 }}>
            <div className="search-input" style={{ width: 240 }}>
              <AdminIcon name="search" size={13} />
              <input placeholder={tab === "varejo" ? "Buscar por cliente ou pedido..." : "Buscar por cliente, CNPJ..."} />
            </div>
            <select className="select" style={{ width: "auto" }}>
              <option>Maio 2026</option>
              <option>Abril 2026</option>
              <option>Últimos 90 dias</option>
            </select>
            <select className="select" style={{ width: "auto" }}>
              <option>Todos os status</option>
              <option>Pago</option>
              <option>Pendente</option>
              <option>Em Produção</option>
              <option>Enviado</option>
              <option>Cancelado</option>
            </select>
            <button className="btn ghost"><AdminIcon name="filter" /> Mais</button>
          </div>
          <div className="cust-meta">
            Total: <b style={{ color: "var(--text)" }}>{tab === "varejo" ? "R$ 2.929,90" : "R$ 25.892,00"}</b>
          </div>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                {tab === "varejo" ? (
                  <tr>
                    <th style={{ width: 90 }}>#</th>
                    <th style={{ width: 70 }}>Data</th>
                    <th>Cliente</th>
                    <th style={{ width: 70 }}>Itens</th>
                    <th style={{ width: 110 }}>Total</th>
                    <th style={{ width: 110 }}>Pagamento</th>
                    <th style={{ width: 130 }}>Status</th>
                    <th style={{ width: 80 }}>Ações</th>
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
                {tab === "varejo" && varejo.map((o) => (
                  <>
                    <tr key={o.num} style={expandedOrder === o.num ? { background: "var(--surface-2)" } : {}}>
                      <td><span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--text-2)" }}>{o.num}</span></td>
                      <td>{o.date}</td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <div className="thumb" style={{ width: 22, height: 22, fontSize: 9, background: "linear-gradient(135deg,#c9b6c9,#8b6b8b)", color: "#fff" }}>
                            {o.cust.split(" ").map(s => s[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{o.cust}</div>
                            <div className="cust-meta">{o.city}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{o.items}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{o.total}</td>
                      <td className="cust-meta">{o.payment}</td>
                      <td><span className={`badge ${STATUS[o.status].cls}`}><span className="dot" />{STATUS[o.status].txt}</span></td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                          <button className="icon-btn" onClick={() => setExpandedOrder(expandedOrder === o.num ? null : o.num)}>
                            <AdminIcon name={expandedOrder === o.num ? "chevUp" : "chevDown"} size={12} />
                          </button>
                          <button className="icon-btn"><AdminIcon name="moreH" size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandedOrder === o.num && (
                      <tr key={`${o.num}-detail`} className="child">
                        <td colSpan={8} style={{ padding: 0, height: "auto" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
                            <div style={{ padding: 16, borderRight: "1px solid var(--border)" }}>
                              <div className="cust-meta" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10.5, fontWeight: 500 }}>Itens</div>
                              {orderItems.map((it, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < orderItems.length - 1 ? "1px dashed var(--border)" : "none" }}>
                                  <div className="thumb bag" style={{ width: 28, height: 28 }}><AdminIcon name="bag" size={12} /></div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.name}</div>
                                    <div className="cust-meta tiny">{it.sku} · Qtd. {it.qty}</div>
                                  </div>
                                  <div className="num" style={{ fontSize: 12.5 }}>{it.price}</div>
                                </div>
                              ))}
                              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                                <span>Total</span><span>{o.total}</span>
                              </div>
                            </div>
                            <div style={{ padding: 16, borderRight: "1px solid var(--border)" }}>
                              <div className="cust-meta" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10.5, fontWeight: 500 }}>Endereço de envio</div>
                              <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                                <div style={{ fontWeight: 500 }}>{o.cust}</div>
                                <div>Rua das Laranjeiras, 482, apt. 31</div>
                                <div>Laranjeiras · {o.city}</div>
                                <div>CEP 22240-006</div>
                              </div>
                              <div style={{ marginTop: 12 }}>
                                <span className="chip"><AdminIcon name="truck" size={11} /> Correios PAC · 5–8 dias</span>
                              </div>
                            </div>
                            <div style={{ padding: 16 }}>
                              <div className="cust-meta" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10.5, fontWeight: 500 }}>Pagamento</div>
                              <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                                <div><b>{o.payment}</b></div>
                                <div className="cust-meta">Aprovado em {o.date} às 14:33</div>
                              </div>
                              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                                <button className="btn primary sm"><AdminIcon name="truck" size={11} /> Marcar como Enviado</button>
                                <button className="btn sm"><AdminIcon name="eye" size={11} /> Ver detalhes</button>
                                <button className="btn sm danger-outline"><AdminIcon name="x" size={11} /> Cancelar pedido</button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {tab === "atacado" && atacado.map((o) => (
                  <tr key={o.num}>
                    <td><span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--text-2)" }}>{o.num}</span></td>
                    <td>{o.date}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div className="thumb" style={{ width: 22, height: 22, fontSize: 9, background: "linear-gradient(135deg,#d8c89a,#a08956)", color: "#fff" }}>
                          {o.cust.split(" ").map(s => s[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{o.cust}</div>
                          <div className="cust-meta">{o.cnpj} · {o.contact}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{o.items}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{o.total}</td>
                    <td>{o.op === "—" ? <span className="cust-meta">—</span> : <button className="linkish" style={{ fontSize: 12 }}>{o.op}</button>}</td>
                    <td><span className={`badge ${STATUS[o.status].cls}`}><span className="dot" />{STATUS[o.status].txt}</span></td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
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
