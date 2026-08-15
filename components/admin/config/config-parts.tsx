"use client" // toggles e botões de salvar guardam estado local

import { useState } from 'react'
import { updateStoreSettings, type StoreSettings } from '@/lib/actions/settings'
import { useRouter } from 'next/navigation'

export type ToggleProps = {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function Toggle({ value, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: value ? 'var(--accent)' : 'var(--border-strong)',
        transition: 'background 150ms',
        display: 'flex', alignItems: 'center', opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transform: value ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform 150ms', display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  )
}

/**
 * Lista de chaves booleanas de store_settings. Salva na hora — são switches, e
 * switch com botão "salvar" ao lado é um convite a esquecer de clicar.
 */
export function ToggleList({
  settings,
  items,
}: {
  settings: StoreSettings
  items: Array<{ key: keyof StoreSettings; label: string }>
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Otimista: o switch anda na hora e volta atrás se o servidor recusar.
  const [override, setOverride] = useState<Partial<Record<string, boolean>>>({})

  async function toggle(key: keyof StoreSettings, value: boolean) {
    setPending(String(key))
    setError(null)
    setOverride((o) => ({ ...o, [String(key)]: value }))

    const res = await updateStoreSettings({ [key]: value } as Parameters<typeof updateStoreSettings>[0])
    setPending(null)

    if (!res.ok) {
      setOverride((o) => ({ ...o, [String(key)]: !value }))
      setError(res.error ?? 'Não foi possível salvar.')
      return
    }
    setOverride((o) => {
      const next = { ...o }
      delete next[String(key)]
      return next
    })
    router.refresh()
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map(({ key, label }) => {
        const k = String(key)
        const value = k in override ? Boolean(override[k]) : Boolean(settings[key])
        return (
          <div key={k} className="row between"
            style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6, gap: 12 }}>
            <span style={{ fontSize: 12.5 }}>{label}</span>
            <Toggle value={value} onChange={(v) => toggle(key, v)} disabled={pending === k} />
          </div>
        )
      })}
      {error && <div className="alert alert-error" style={{ fontSize: 12 }}>{error}</div>}
    </div>
  )
}

export function SaveButton({ saving, onClick, id }: { saving: boolean; onClick: () => void; id?: string }) {
  return (
    <button
      type="button"
      className="btn primary"
      id={id}
      disabled={saving}
      onClick={onClick}
      style={{ minWidth: 120, opacity: saving ? 0.7 : 1 }}
    >
      {saving ? 'Salvando…' : 'Salvar alterações'}
    </button>
  )
}

/** Rodapé de card com o botão de salvar e o aviso de "Salvo!". */
export function SaveRow({ saving, saved, onSave, id }: {
  saving: boolean
  saved: boolean
  onSave: () => void
  id?: string
}) {
  return (
    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
      {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Salvo!</span>}
      <SaveButton saving={saving} onClick={onSave} id={id} />
    </div>
  )
}

/** Estado de "salvando / salvou / deu erro" que toda seção de formulário repete. */
export function useSaveState() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setSaving(true)
    setError(null)
    const res = await fn()
    setSaving(false)

    if (!res.ok) {
      setError(res.error ?? 'Não foi possível salvar.')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return { saving, saved, error, run }
}
