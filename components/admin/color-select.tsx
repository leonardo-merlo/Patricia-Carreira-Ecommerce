"use client"

// Client component: mantém o estado do campo "nova cor" e chama a server action
// sem recarregar o modal do produto, que perderia tudo que estava preenchido.

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { createMaterialColor } from '@/lib/actions/material-colors'
import type { MaterialColor } from '@/lib/types'

const NEW_COLOR_VALUE = '__nova__'

interface ColorSelectProps {
  category: string
  colors: MaterialColor[]
  value: string
  onChange: (color: string) => void
  /** Chamado quando uma cor nova nasce, para o pai somar à paleta em memória. */
  onColorCreated: (color: MaterialColor) => void
  testId: string
}

/**
 * Dropdown da paleta de uma categoria, com criação de cor embutida.
 *
 * A "Indefinida" (placeholder) só aparece se a variante já estiver nela — é
 * marcador de pendência vindo do backfill, não uma opção de preenchimento.
 */
export function ColorSelect({
  category,
  colors,
  value,
  onChange,
  onColorCreated,
  testId,
}: ColorSelectProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const options = colors.filter((c) => !c.is_placeholder || c.name === value)
  const isUndefined = colors.some((c) => c.name === value && c.is_placeholder)

  async function handleCreate() {
    const name = newName.trim()
    if (!name) {
      setError('Informe o nome da cor.')
      return
    }

    setSaving(true)
    setError(null)
    const result = await createMaterialColor(category, name)
    setSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    onColorCreated(result.color)
    onChange(result.color.name)
    setNewName('')
    setCreating(false)
  }

  if (creating) {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            className="input"
            autoFocus
            data-testid={`${testId}-nova`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreate()
              }
            }}
            placeholder="Nome da cor"
          />
          <button className="btn sm primary" type="button" onClick={handleCreate} disabled={saving}>
            {saving ? '…' : 'Salvar'}
          </button>
          <button
            className="icon-btn"
            type="button"
            title="Cancelar"
            onClick={() => {
              setCreating(false)
              setNewName('')
              setError(null)
            }}
          >
            <AdminIcon name="x" size={11} />
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: 'var(--red)' }}>{error}</div>}
      </div>
    )
  }

  return (
    <select
      className="select"
      data-testid={testId}
      value={value}
      style={isUndefined ? { borderColor: 'var(--yellow)' } : undefined}
      onChange={(e) => {
        if (e.target.value === NEW_COLOR_VALUE) {
          setCreating(true)
          return
        }
        onChange(e.target.value)
      }}
    >
      <option value="">Escolha a cor…</option>
      {options.map((c) => (
        <option key={c.id} value={c.name}>
          {c.is_placeholder ? `${c.name} (pendente)` : c.name}
        </option>
      ))}
      <option value={NEW_COLOR_VALUE}>+ Nova cor…</option>
    </select>
  )
}
