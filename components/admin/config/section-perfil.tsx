"use client" // formulário controlado

import { useState } from 'react'
import { updateStoreSettings, type StoreSettings } from '@/lib/actions/settings'
import { SaveRow, useSaveState } from './config-parts'

export function SectionPerfil({ settings }: { settings: StoreSettings }) {
  const { saving, saved, error, run } = useSaveState()
  const [form, setForm] = useState({
    store_name: settings.store_name,
    store_slogan: settings.store_slogan ?? '',
    store_description: settings.store_description ?? '',
    contact_email: settings.contact_email ?? '',
    contact_phone: settings.contact_phone ?? '',
    cnpj: settings.cnpj ?? '',
    address_full: settings.address_full ?? '',
    logo_url: settings.logo_url ?? '',
  })

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div className="card">
      <div className="card-header"><h3 className="ttl">Identidade da marca</h3></div>
      <div className="card-body">
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="config-grid-2">
            <div className="field">
              <label htmlFor="cfg-store-name">Nome da loja</label>
              <input className="input" id="cfg-store-name" {...field('store_name')} />
            </div>
            <div className="field">
              <label htmlFor="cfg-slogan">Slogan</label>
              <input className="input" id="cfg-slogan" {...field('store_slogan')} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="cfg-descricao">Descrição (exibida na loja)</label>
            <textarea className="input" id="cfg-descricao" rows={3}
              style={{ height: 'auto', padding: 8, resize: 'vertical' }} {...field('store_description')} />
          </div>

          <div className="config-grid-2">
            <div className="field">
              <label htmlFor="cfg-email">E-mail de contato</label>
              <input className="input" id="cfg-email" type="email" {...field('contact_email')} />
            </div>
            <div className="field">
              <label htmlFor="cfg-telefone">Telefone / WhatsApp</label>
              <input className="input" id="cfg-telefone" {...field('contact_phone')} />
            </div>
          </div>

          <div className="config-grid-2">
            <div className="field">
              <label htmlFor="cfg-cnpj">CNPJ</label>
              <input className="input" id="cfg-cnpj" placeholder="00.000.000/0001-00" {...field('cnpj')} />
            </div>
            <div className="field">
              <label htmlFor="cfg-endereco">Endereço completo</label>
              <input className="input" id="cfg-endereco" placeholder="Rua, nº — Arraial d'Ajuda, BA" {...field('address_full')} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="cfg-logo">Logo (URL)</label>
            <input className="input" id="cfg-logo" placeholder="https://…" {...field('logo_url')} />
          </div>

          {error && <div className="alert alert-error" style={{ fontSize: 12 }}>{error}</div>}
        </div>
      </div>
      <SaveRow
        saving={saving}
        saved={saved}
        id="btn-salvar-perfil"
        onSave={() => run(() => updateStoreSettings(form))}
      />
    </div>
  )
}
