"use client"

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'

type Section = "perfil" | "usuarios" | "pagamentos" | "envio" | "fiscal" | "estoque" | "integ" | "notif"

const sections: { id: Section; label: string; icon: "store" | "users" | "creditCard" | "truck" | "fileText" | "box" | "plug" | "bell" }[] = [
  { id: "perfil", label: "Perfil da loja", icon: "store" },
  { id: "usuarios", label: "Usuários", icon: "users" },
  { id: "pagamentos", label: "Pagamentos", icon: "creditCard" },
  { id: "envio", label: "Frete e envio", icon: "truck" },
  { id: "fiscal", label: "Fiscal / NF-e", icon: "fileText" },
  { id: "estoque", label: "Estoque", icon: "box" },
  { id: "integ", label: "Integrações", icon: "plug" },
  { id: "notif", label: "Notificações", icon: "bell" },
]

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <button
      className="switch"
      data-on={on}
      onClick={() => setOn(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", padding: 2, cursor: "pointer",
        background: on ? "var(--accent)" : "var(--border-strong)",
        transition: "background 150ms",
        display: "flex", alignItems: "center",
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transform: on ? "translateX(16px)" : "translateX(0)",
        transition: "transform 150ms", display: "block",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }} />
    </button>
  )
}

function SectionPerfil() {
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Identidade da marca</h3></div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>Nome da loja</label><input className="input" defaultValue="Patrícia Carreira" /></div>
              <div className="field"><label>Slogan</label><input className="input" defaultValue="Moda artesanal com alma" /></div>
            </div>
            <div className="field">
              <label>Descrição (exibida na loja)</label>
              <textarea className="input" rows={3} style={{ height: "auto", padding: 8, resize: "vertical" }}
                defaultValue="Peças únicas em couro, linho e tecidos naturais, feitas à mão em Arraial d'Ajuda." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>E-mail de contato</label><input className="input" defaultValue="contato@patriciacarreira.com.br" /></div>
              <div className="field"><label>Telefone / WhatsApp</label><input className="input" defaultValue="(73) 9 9812-3344" /></div>
            </div>
            <div className="field">
              <label>Logo (URL ou upload)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" placeholder="https://..." style={{ flex: 1 }} />
                <button className="btn"><AdminIcon name="upload" size={12} /> Upload</button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn primary" id="btn-salvar-perfil">Salvar alterações</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Preferências regionais</h3></div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Fuso horário</label>
              <select className="select"><option>America/Bahia (UTC-3)</option><option>America/Sao_Paulo (UTC-3)</option></select>
            </div>
            <div className="field">
              <label>Moeda</label>
              <select className="select"><option>BRL — Real Brasileiro</option></select>
            </div>
            <div className="field">
              <label>Idioma</label>
              <select className="select"><option>Português (BR)</option></select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionUsuarios() {
  const users = [
    { name: "Henrique Carreira", email: "henrique@patriciacarreira.com.br", role: "admin", lastLogin: "Hoje, 09:14" },
    { name: "Patrícia Carreira", email: "patricia@patriciacarreira.com.br", role: "viewer", lastLogin: "18/05/2026" },
  ]
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="ttl">Usuários do painel</h3>
        <button className="btn primary sm" id="btn-convidar-usuario"><AdminIcon name="plus" size={11} /> Convidar</button>
      </div>
      <div className="card-body flush">
        <table className="tbl">
          <thead>
            <tr>
              <th>Usuário</th>
              <th style={{ width: 120 }}>Perfil</th>
              <th style={{ width: 160 }}>Último acesso</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="thumb" style={{ width: 28, height: 28, fontSize: 11, background: "linear-gradient(135deg,#c97d60,#a8625a)", color: "#fff" }}>
                      {u.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.name}</div>
                      <div className="cust-meta tiny">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <select className="select" defaultValue={u.role} style={{ fontSize: 12 }}>
                    <option value="admin">Administrador</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </td>
                <td className="cust-meta">{u.lastLogin}</td>
                <td>
                  {u.role !== "admin" && (
                    <button className="icon-btn" title="Remover"><AdminIcon name="trash" size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SectionPagamentos() {
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Mercado Pago</h3><span className="badge pago">Conectado</span></div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field"><label>Access Token (produção)</label>
              <input className="input" type="password" defaultValue="APP_USR-xxxxxxxxxxxxxxxxxxxx" />
            </div>
            <div className="field"><label>Public Key</label>
              <input className="input" type="password" defaultValue="APP_USR-xxxxxxxx-xxxx-xxxx" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                <div className="cust-meta" style={{ fontSize: 11 }}>PIX</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>0,99%</div>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                <div className="cust-meta" style={{ fontSize: 11 }}>Cartão crédito</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>4,99%</div>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                <div className="cust-meta" style={{ fontSize: 11 }}>Parcelamento máx.</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>6x</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn ghost">Testar conexão</button>
          <button className="btn primary" id="btn-salvar-pagamentos">Salvar</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Conta bancária (para repasse)</h3></div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label>Banco</label><input className="input" defaultValue="Nubank" /></div>
            <div className="field"><label>Tipo de conta</label>
              <select className="select"><option>Conta corrente</option><option>Conta poupança</option></select>
            </div>
            <div className="field"><label>Agência</label><input className="input" placeholder="0001" /></div>
            <div className="field"><label>Número da conta</label><input className="input" placeholder="12345-6" /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionEnvio() {
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Melhor Envio</h3><span className="badge pago">Conectado</span></div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field"><label>Token de acesso</label>
              <input className="input" type="password" defaultValue="eyJhbGciOiJSUzI1NiJ9.xxxxxxxx" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field"><label>CEP de origem</label><input className="input" defaultValue="45816-000" /></div>
              <div className="field"><label>Prazo adicional (dias)</label><input className="input" type="number" defaultValue="1" /></div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Transportadoras habilitadas</div>
              <div style={{ display: "grid", gap: 6 }}>
                {["Correios (PAC)", "Correios (SEDEX)", "Jadlog (.Package)", "Total Express"].map((t, i) => (
                  <div key={i} className="row between" style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6, fontSize: 12.5 }}>
                    <span>{t}</span>
                    <Toggle defaultChecked={i < 3} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Frete grátis</h3></div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 12 }}>
            <div className="row between" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 12.5 }}>Ativar frete grátis a partir de</div>
                <div className="cust-meta">Aplicado automaticamente no checkout quando atingido</div>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label>Valor mínimo do pedido</label>
              <input className="input" defaultValue="R$ 350,00" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionFiscal() {
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Focus NFe</h3><span className="badge pago">Conectado</span></div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field"><label>Token de acesso</label>
                <input className="input" type="password" defaultValue="focusnfe_xxxxxxxxxxxxxxxxxxxxxxxx" />
              </div>
              <div className="field"><label>Ambiente</label>
                <select className="select"><option>Produção</option><option>Homologação (testes)</option></select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field"><label>CNPJ emitente</label><input className="input" defaultValue="12.345.678/0001-99" /></div>
              <div className="field"><label>Regime tributário</label>
                <select className="select"><option>Simples Nacional</option><option>Lucro Presumido</option></select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field"><label>Série NF-e</label><input className="input" defaultValue="1" /></div>
              <div className="field"><label>Natureza da operação</label><input className="input" defaultValue="Venda de mercadoria" /></div>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-2)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
            Certificado A1 válido até <b style={{ color: "var(--text)" }}>15/03/2027</b>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost">Emitir NF-e de teste</button>
            <button className="btn primary" id="btn-salvar-fiscal">Salvar</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Emissão automática</h3></div>
        <div className="card-body" style={{ display: "grid", gap: 10 }}>
          {[
            { label: "Emitir NF-e automaticamente após pagamento confirmado (varejo)", defaultOn: true },
            { label: "Enviar DANFE por e-mail ao cliente", defaultOn: true },
            { label: "Gerar NF-e para pedidos atacado manualmente", defaultOn: false },
          ].map((item, i) => (
            <div key={i} className="row between" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
              <span style={{ fontSize: 12.5 }}>{item.label}</span>
              <Toggle defaultChecked={item.defaultOn} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionEstoque() {
  return (
    <div className="card">
      <div className="card-header"><h3 className="ttl">Alertas de estoque</h3></div>
      <div className="card-body" style={{ display: "grid", gap: 10 }}>
        {[
          { label: "Alertar quando produto acabado atingir estoque mínimo", defaultOn: true },
          { label: "Alertar quando matéria-prima atingir estoque mínimo", defaultOn: true },
          { label: "Bloquear venda quando estoque = 0 (varejo)", defaultOn: true },
          { label: "Permitir pedido atacado sem estoque (produzir sob demanda)", defaultOn: true },
          { label: "Exibir aviso de poucas unidades na loja (≤ 3 un.)", defaultOn: false },
        ].map((item, i) => (
          <div key={i} className="row between" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
            <span style={{ fontSize: 12.5 }}>{item.label}</span>
            <Toggle defaultChecked={item.defaultOn} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionInteg() {
  const integrations = [
    { name: "Mercado Pago", desc: "Gateway de pagamentos", status: "connected", icon: "creditCard" as const },
    { name: "Melhor Envio", desc: "Cálculo de frete e etiquetas", status: "connected", icon: "truck" as const },
    { name: "Focus NFe", desc: "Emissão automática de NF-e", status: "connected", icon: "fileText" as const },
    { name: "Resend", desc: "E-mails transacionais", status: "connected", icon: "mail" as const },
    { name: "OpenClaw", desc: "Automação via Telegram", status: "pending", icon: "plug" as const },
    { name: "ViaCEP", desc: "Preenchimento de endereços", status: "active", icon: "mapPin" as const },
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
      {integrations.map((intg, i) => (
        <div className="card" key={i} style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div className="thumb" style={{ width: 36, height: 36, borderRadius: 8, fontSize: 14, background: "var(--surface-2)", color: "var(--text-2)", flexShrink: 0 }}>
              <AdminIcon name={intg.icon} size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{intg.name}</span>
                {intg.status === "connected" && <span className="badge pago" style={{ fontSize: 10.5 }}>Ativo</span>}
                {intg.status === "pending" && <span className="badge neutral" style={{ fontSize: 10.5 }}>Pendente</span>}
                {intg.status === "active" && <span className="badge pago" style={{ fontSize: 10.5 }}>Ativo</span>}
              </div>
              <div className="cust-meta" style={{ marginTop: 2 }}>{intg.desc}</div>
            </div>
          </div>
          <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
            <button className={`btn sm ${intg.status === "pending" ? "primary" : "ghost"}`}>
              {intg.status === "pending" ? "Configurar" : "Ver configurações"}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionNotif() {
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">E-mail (Resend)</h3></div>
        <div className="card-body" style={{ display: "grid", gap: 10 }}>
          {[
            { label: "Confirmação de pedido (varejo)", defaultOn: true },
            { label: "Pedido enviado — com código de rastreio", defaultOn: true },
            { label: "Pedido entregue", defaultOn: false },
            { label: "Cancelamento de pedido", defaultOn: true },
            { label: "Novo cadastro de cliente", defaultOn: false },
          ].map((item, i) => (
            <div key={i} className="row between" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
              <span style={{ fontSize: 12.5 }}>{item.label}</span>
              <Toggle defaultChecked={item.defaultOn} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Notificações internas (painel)</h3></div>
        <div className="card-body" style={{ display: "grid", gap: 10 }}>
          {[
            { label: "Novo pedido recebido", defaultOn: true },
            { label: "Pagamento confirmado", defaultOn: true },
            { label: "Estoque abaixo do mínimo", defaultOn: true },
            { label: "Matéria-prima abaixo do mínimo", defaultOn: true },
          ].map((item, i) => (
            <div key={i} className="row between" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
              <span style={{ fontSize: 12.5 }}>{item.label}</span>
              <Toggle defaultChecked={item.defaultOn} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const sectionContent: Record<Section, React.ReactNode> = {
  perfil: <SectionPerfil />,
  usuarios: <SectionUsuarios />,
  pagamentos: <SectionPagamentos />,
  envio: <SectionEnvio />,
  fiscal: <SectionFiscal />,
  estoque: <SectionEstoque />,
  integ: <SectionInteg />,
  notif: <SectionNotif />,
}

export default function ConfigPage() {
  const [active, setActive] = useState<Section>("perfil")

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Configurações</h2>
          <p className="page-sub">Perfil da loja, integrações e preferências do sistema</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "var(--gap)", alignItems: "flex-start" }}>
        <div className="card" style={{ padding: "8px 0", position: "sticky", top: 78 }}>
          {sections.map(s => (
            <button
              key={s.id}
              className={`sidebar-item ${active === s.id ? "active" : ""}`}
              id={`btn-config-${s.id}`}
              onClick={() => setActive(s.id)}
              style={{
                width: "calc(100% - 16px)", borderRadius: 5, margin: "1px 8px",
                background: active === s.id ? "var(--accent-soft)" : "transparent",
                color: active === s.id ? "var(--accent)" : "var(--text-2)",
                border: "none", padding: "8px 10px", display: "flex", alignItems: "center",
                gap: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                transition: "background 80ms",
              }}
            >
              <AdminIcon name={s.icon} size={14} />
              {s.label}
            </button>
          ))}
        </div>

        <div>
          {sectionContent[active]}
        </div>
      </div>
    </div>
  )
}
