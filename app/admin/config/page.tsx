"use client"

import { useState, useEffect, useCallback } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { getStoreSettings, updateStoreSettings, type StoreSettings } from '@/lib/actions/settings'

type Section = "perfil" | "pagamentos" | "envio" | "fiscal" | "estoque" | "integ" | "notif"

const sections: { id: Section; label: string; icon: "store" | "creditCard" | "truck" | "fileText" | "box" | "plug" | "bell" }[] = [
  { id: "perfil",    label: "Perfil da loja",  icon: "store" },
  { id: "pagamentos",label: "Pagamentos",       icon: "creditCard" },
  { id: "envio",     label: "Frete e envio",    icon: "truck" },
  { id: "fiscal",    label: "Fiscal / NF-e",   icon: "fileText" },
  { id: "estoque",   label: "Estoque",          icon: "box" },
  { id: "integ",     label: "Integrações",      icon: "plug" },
  { id: "notif",     label: "Notificações",     icon: "bell" },
]

// ─── Controlled toggle ────────────────────────────────────────────────────────

type ToggleProps = {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

function Toggle({ value, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", padding: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        background: value ? "var(--accent)" : "var(--border-strong)",
        transition: "background 150ms",
        display: "flex", alignItems: "center", opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transform: value ? "translateX(16px)" : "translateX(0)",
        transition: "transform 150ms", display: "block",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }} />
    </button>
  )
}

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveButton({ saving, onClick, id }: { saving: boolean; onClick: () => void; id?: string }) {
  return (
    <button
      type="button"
      className="btn primary"
      id={id}
      disabled={saving}
      onClick={onClick}
      style={{ minWidth: 120, opacity: saving ? 0.7 : 1 }}
    >
      {saving ? "Salvando…" : "Salvar alterações"}
    </button>
  )
}

// ─── Seção: Perfil ────────────────────────────────────────────────────────────

function SectionPerfil({ s, onToggle }: { s: StoreSettings; onToggle: (key: keyof StoreSettings, value: unknown) => void }) {
  const [form, setForm] = useState({
    store_name: s.store_name,
    store_slogan: s.store_slogan ?? '',
    store_description: s.store_description ?? '',
    contact_email: s.contact_email ?? '',
    contact_phone: s.contact_phone ?? '',
    cnpj: s.cnpj ?? '',
    address_full: s.address_full ?? '',
    logo_url: s.logo_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({
      store_name: s.store_name,
      store_slogan: s.store_slogan ?? '',
      store_description: s.store_description ?? '',
      contact_email: s.contact_email ?? '',
      contact_phone: s.contact_phone ?? '',
      cnpj: s.cnpj ?? '',
      address_full: s.address_full ?? '',
      logo_url: s.logo_url ?? '',
    })
  }, [s])

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  async function save() {
    setSaving(true)
    await updateStoreSettings(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    Object.entries(form).forEach(([k, v]) => onToggle(k as keyof StoreSettings, v))
  }

  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Identidade da marca</h3></div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Nome da loja</label>
                <input className="input" {...field('store_name')} />
              </div>
              <div className="field">
                <label>Slogan</label>
                <input className="input" {...field('store_slogan')} />
              </div>
            </div>
            <div className="field">
              <label>Descrição (exibida na loja)</label>
              <textarea className="input" rows={3} style={{ height: "auto", padding: 8, resize: "vertical" }}
                {...field('store_description')} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>E-mail de contato</label>
                <input className="input" type="email" {...field('contact_email')} />
              </div>
              <div className="field">
                <label>Telefone / WhatsApp</label>
                <input className="input" {...field('contact_phone')} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>CNPJ</label>
                <input className="input" placeholder="00.000.000/0001-00" {...field('cnpj')} />
              </div>
              <div className="field">
                <label>Endereço completo</label>
                <input className="input" placeholder="Rua, nº — Arraial d'Ajuda, BA" {...field('address_full')} />
              </div>
            </div>
            <div className="field">
              <label>Logo (URL)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" placeholder="https://…" style={{ flex: 1 }} {...field('logo_url')} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          {saved && <span style={{ fontSize: 12, color: "var(--green)" }}>Salvo!</span>}
          <SaveButton saving={saving} onClick={save} id="btn-salvar-perfil" />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Preferências regionais</h3></div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Fuso horário</label>
              <select className="select"><option>America/Bahia (UTC-3)</option></select>
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

// ─── Seção: Pagamentos ────────────────────────────────────────────────────────

function SectionPagamentos() {
  const mpConnected = Boolean(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || true)

  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header">
          <h3 className="ttl">Mercado Pago</h3>
          <span className="badge pago">Conectado</span>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5, color: "var(--text-2)" }}>
              As chaves de API do Mercado Pago são configuradas via variáveis de ambiente
              (<code>MP_ACCESS_TOKEN</code> e <code>NEXT_PUBLIC_MP_PUBLIC_KEY</code>) e não
              ficam armazenadas no banco de dados por questões de segurança.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "PIX", value: "0,99%" },
                { label: "Cartão crédito", value: "4,99%" },
                { label: "Parcelamento máx.", value: "6x" },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                  <div className="cust-meta" style={{ fontSize: 11 }}>{label}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Conta bancária (referência)</h3></div>
        <div className="card-body">
          <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>
            O repasse é gerenciado diretamente no painel do Mercado Pago.
            Registre aqui apenas para controle interno.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label>Banco</label><input className="input" defaultValue="Nubank" /></div>
            <div className="field">
              <label>Tipo de conta</label>
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

// ─── Seção: Envio ─────────────────────────────────────────────────────────────

const ALL_CARRIERS = ["Correios (PAC)", "Correios (SEDEX)", "Jadlog (.Package)", "Total Express"]

function SectionEnvio({ s, onToggle }: { s: StoreSettings; onToggle: (key: keyof StoreSettings, value: unknown) => void }) {
  const [originCep, setOriginCep] = useState(s.origin_cep ?? '')
  const [extraDays, setExtraDays] = useState(String(s.shipping_extra_days))
  const [threshold, setThreshold] = useState(String(s.free_shipping_threshold))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setOriginCep(s.origin_cep ?? '')
    setExtraDays(String(s.shipping_extra_days))
    setThreshold(String(s.free_shipping_threshold))
  }, [s])

  async function toggleCarrier(carrier: string, enabled: boolean) {
    const current = s.enabled_carriers ?? []
    const next = enabled
      ? [...current, carrier]
      : current.filter(c => c !== carrier)
    await updateStoreSettings({ enabled_carriers: next })
    onToggle('enabled_carriers', next)
  }

  async function save() {
    setSaving(true)
    await updateStoreSettings({
      origin_cep: originCep,
      shipping_extra_days: Number(extraDays) || 1,
      free_shipping_threshold: Number(threshold) || 350,
    })
    onToggle('origin_cep', originCep)
    onToggle('shipping_extra_days', Number(extraDays) || 1)
    onToggle('free_shipping_threshold', Number(threshold) || 350)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header">
          <h3 className="ttl">Melhor Envio</h3>
          <span className="badge pago">Conectado</span>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5, color: "var(--text-2)" }}>
              O token do Melhor Envio é configurado via variável de ambiente
              (<code>MELHOR_ENVIO_TOKEN</code>) por questões de segurança.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field">
                <label>CEP de origem</label>
                <input className="input" value={originCep} onChange={e => setOriginCep(e.target.value)} placeholder="00000-000" />
              </div>
              <div className="field">
                <label>Prazo adicional (dias)</label>
                <input className="input" type="number" min={0} max={30}
                  value={extraDays} onChange={e => setExtraDays(e.target.value)} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Transportadoras habilitadas</div>
              <div style={{ display: "grid", gap: 6 }}>
                {ALL_CARRIERS.map(carrier => (
                  <div key={carrier} className="row between"
                    style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6, fontSize: 12.5 }}>
                    <span>{carrier}</span>
                    <Toggle
                      value={(s.enabled_carriers ?? []).includes(carrier)}
                      onChange={v => toggleCarrier(carrier, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          {saved && <span style={{ fontSize: 12, color: "var(--green)" }}>Salvo!</span>}
          <SaveButton saving={saving} onClick={save} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Frete grátis</h3></div>
        <div className="card-body">
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field" style={{ maxWidth: 220 }}>
              <label>Valor mínimo do pedido (R$)</label>
              <input className="input" type="number" min={0}
                value={threshold} onChange={e => setThreshold(e.target.value)} />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>
              Aplicado automaticamente no checkout. Disponível para a transportadora mais barata.
            </p>
          </div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <SaveButton saving={saving} onClick={save} />
        </div>
      </div>
    </div>
  )
}

// ─── Seção: Fiscal / NF-e ────────────────────────────────────────────────────

type BoolKey = keyof StoreSettings

function SectionFiscal({ s, onToggle }: { s: StoreSettings; onToggle: (key: BoolKey, value: unknown) => void }) {
  async function toggle(key: BoolKey, value: boolean) {
    await updateStoreSettings({ [key]: value } as Parameters<typeof updateStoreSettings>[0])
    onToggle(key, value)
  }

  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header">
          <h3 className="ttl">Focus NFe</h3>
          <span className="badge pago">Conectado</span>
        </div>
        <div className="card-body">
          <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5, color: "var(--text-2)" }}>
            Token, CNPJ, ambiente e regime tributário são configurados via variáveis de ambiente
            (<code>FOCUSNFE_TOKEN</code>, <code>STORE_CNPJ</code>, <code>FOCUSNFE_HOMOLOGACAO</code>, <code>STORE_REGIME</code>).
            Configure-os no painel da Vercel ou no arquivo <code>.env.local</code>.
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn ghost" type="button">Emitir NF-e de teste</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Emissão automática</h3></div>
        <div className="card-body" style={{ display: "grid", gap: 10 }}>
          {([
            { key: "auto_nfe_retail" as BoolKey,      label: "Emitir NF-e automaticamente após pagamento confirmado (varejo)" },
            { key: "send_danfe_email" as BoolKey,     label: "Enviar DANFE por e-mail ao cliente" },
            { key: "manual_nfe_wholesale" as BoolKey, label: "Gerar NF-e para pedidos atacado manualmente" },
          ] as { key: BoolKey; label: string }[]).map(({ key, label }) => (
            <div key={key} className="row between"
              style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
              <span style={{ fontSize: 12.5 }}>{label}</span>
              <Toggle value={Boolean(s[key])} onChange={v => toggle(key, v)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Seção: Estoque ───────────────────────────────────────────────────────────

function SectionEstoque({ s, onToggle }: { s: StoreSettings; onToggle: (key: BoolKey, value: unknown) => void }) {
  async function toggle(key: BoolKey, value: boolean) {
    await updateStoreSettings({ [key]: value } as Parameters<typeof updateStoreSettings>[0])
    onToggle(key, value)
  }

  const items: { key: BoolKey; label: string }[] = [
    { key: "alert_finished_stock",    label: "Alertar quando produto acabado atingir estoque mínimo" },
    { key: "alert_raw_material",      label: "Alertar quando matéria-prima atingir estoque mínimo" },
    { key: "block_sale_zero_stock",   label: "Bloquear venda quando estoque = 0 (varejo)" },
    { key: "allow_wholesale_no_stock",label: "Permitir pedido atacado sem estoque (produzir sob demanda)" },
    { key: "show_low_stock_warning",  label: "Exibir aviso de poucas unidades na loja (≤ 3 un.)" },
  ]

  return (
    <div className="card">
      <div className="card-header"><h3 className="ttl">Alertas de estoque</h3></div>
      <div className="card-body" style={{ display: "grid", gap: 10 }}>
        {items.map(({ key, label }) => (
          <div key={key} className="row between"
            style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
            <span style={{ fontSize: 12.5 }}>{label}</span>
            <Toggle value={Boolean(s[key])} onChange={v => toggle(key, v)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Seção: Integrações ───────────────────────────────────────────────────────

function SectionInteg() {
  const integrations = [
    { name: "Mercado Pago",   desc: "Gateway de pagamentos",        status: "connected", icon: "creditCard" as const },
    { name: "Melhor Envio",   desc: "Cálculo de frete e etiquetas", status: "connected", icon: "truck" as const },
    { name: "Focus NFe",      desc: "Emissão automática de NF-e",   status: "connected", icon: "fileText" as const },
    { name: "Resend",         desc: "E-mails transacionais",        status: "connected", icon: "mail" as const },
    { name: "OpenClaw",       desc: "Automação via Telegram",       status: "pending",   icon: "plug" as const },
    { name: "ViaCEP",         desc: "Preenchimento de endereços",   status: "active",    icon: "mapPin" as const },
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
                {intg.status !== "pending" && <span className="badge pago" style={{ fontSize: 10.5 }}>Ativo</span>}
                {intg.status === "pending"  && <span className="badge neutral" style={{ fontSize: 10.5 }}>Pendente</span>}
              </div>
              <div className="cust-meta" style={{ marginTop: 2 }}>{intg.desc}</div>
            </div>
          </div>
          <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
            <button className={`btn sm ${intg.status === "pending" ? "primary" : "ghost"}`} type="button">
              {intg.status === "pending" ? "Configurar" : "Ver configurações"}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Seção: Notificações ──────────────────────────────────────────────────────

function SectionNotif({ s, onToggle }: { s: StoreSettings; onToggle: (key: BoolKey, value: unknown) => void }) {
  async function toggle(key: BoolKey, value: boolean) {
    await updateStoreSettings({ [key]: value } as Parameters<typeof updateStoreSettings>[0])
    onToggle(key, value)
  }

  const emailItems: { key: BoolKey; label: string }[] = [
    { key: "notif_order_confirmed", label: "Confirmação de pedido (varejo)" },
    { key: "notif_order_shipped",   label: "Pedido enviado — com código de rastreio" },
    { key: "notif_order_delivered", label: "Pedido entregue" },
    { key: "notif_order_cancelled", label: "Cancelamento de pedido" },
    { key: "notif_new_customer",    label: "Novo cadastro de cliente" },
  ]

  const internalItems: { key: BoolKey; label: string }[] = [
    { key: "notif_new_order",          label: "Novo pedido recebido" },
    { key: "notif_payment_confirmed",  label: "Pagamento confirmado" },
    { key: "notif_low_stock",          label: "Estoque abaixo do mínimo" },
    { key: "notif_low_material",       label: "Matéria-prima abaixo do mínimo" },
  ]

  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">E-mail (Resend)</h3></div>
        <div className="card-body" style={{ display: "grid", gap: 10 }}>
          {emailItems.map(({ key, label }) => (
            <div key={key} className="row between"
              style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
              <span style={{ fontSize: 12.5 }}>{label}</span>
              <Toggle value={Boolean(s[key])} onChange={v => toggle(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Notificações internas (painel)</h3></div>
        <div className="card-body" style={{ display: "grid", gap: 10 }}>
          {internalItems.map(({ key, label }) => (
            <div key={key} className="row between"
              style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
              <span style={{ fontSize: 12.5 }}>{label}</span>
              <Toggle value={Boolean(s[key])} onChange={v => toggle(key, v)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfigPage() {
  const [active, setActive] = useState<Section>("perfil")
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStoreSettings().then(data => {
      setSettings(data)
      setLoading(false)
    })
  }, [])

  const handleToggle = useCallback((key: keyof StoreSettings, value: unknown) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }, [])

  function renderSection() {
    if (loading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0", color: "var(--text-3)", fontSize: 13 }}>
          Carregando configurações…
        </div>
      )
    }

    if (!settings) {
      return (
        <div style={{ padding: "24px 16px", background: "var(--surface-2)", borderRadius: 8, fontSize: 13, color: "var(--text-2)" }}>
          Não foi possível carregar as configurações. Verifique a conexão com o Supabase.
        </div>
      )
    }

    switch (active) {
      case "perfil":     return <SectionPerfil     s={settings} onToggle={handleToggle} />
      case "pagamentos": return <SectionPagamentos />
      case "envio":      return <SectionEnvio       s={settings} onToggle={handleToggle} />
      case "fiscal":     return <SectionFiscal      s={settings} onToggle={handleToggle} />
      case "estoque":    return <SectionEstoque     s={settings} onToggle={handleToggle} />
      case "integ":      return <SectionInteg />
      case "notif":      return <SectionNotif       s={settings} onToggle={handleToggle} />
    }
  }

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
              type="button"
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

        <div>{renderSection()}</div>
      </div>
    </div>
  )
}
