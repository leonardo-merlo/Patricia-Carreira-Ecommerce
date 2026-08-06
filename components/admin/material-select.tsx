"use client"

// Client component: guarda o estado do formulário inline de criação sem
// recarregar o modal do produto, que perderia tudo que já foi preenchido.

import { useState } from 'react'
import { createRecipeMaterial } from '@/lib/actions/recipe-materials'
import type { CutCategoryRow } from '@/lib/types'
import type { RecipeMaterialOption } from '@/lib/supabase/admin-queries'

const CREATE_VALUE = '__novo__'
const FIXED_CATEGORIES = ['Aplicações', 'Metais', 'Aviamentos'] as const
const UNITS = ['unidade', 'metro', 'cm', 'kg'] as const

/** Chave de deduplicação: cortes ignoram a cor, os demais são o próprio id. */
export function optionKey(
  o: Pick<RecipeMaterialOption, 'category' | 'type' | 'raw_material_id'>,
): string {
  return o.raw_material_id ?? `${o.category}||${o.type}`
}

interface MaterialSelectProps {
  options: RecipeMaterialOption[]
  cutCategories: CutCategoryRow[]
  /** Chaves já na receita, para não oferecer duplicata. */
  usedKeys: Set<string>
  onPick: (option: RecipeMaterialOption) => void
  onCreated: (option: RecipeMaterialOption) => void
}

/**
 * Seletor de insumo da receita, com criação embutida.
 *
 * Um gesto só: escolher da lista ou criar. A diferença de comportamento fica
 * embaixo — corte não gera linha de estoque (a cor ainda não existe nesse
 * momento), insumo de cor fixa gera.
 */
export function MaterialSelect({
  options,
  cutCategories,
  usedKeys,
  onPick,
  onCreated,
}: MaterialSelectProps) {
  const [creating, setCreating] = useState(false)
  const [category, setCategory] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<string>('unidade')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const available = options.filter((o) => !usedKeys.has(optionKey(o)))
  const cuts = available.filter((o) => o.is_cut)
  const fixed = available.filter((o) => !o.is_cut)
  const isCutCategory = cutCategories.some((c) => c.category === category)

  async function handleCreate() {
    if (!category) {
      setError('Escolha a categoria.')
      return
    }
    if (!name.trim()) {
      setError('Informe o nome do insumo.')
      return
    }

    setSaving(true)
    setError(null)
    const result = await createRecipeMaterial({ category, type: name, unit })
    setSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    onCreated(result.option)
    onPick(result.option)
    setCreating(false)
    setCategory('')
    setName('')
    setUnit('unidade')
  }

  if (creating) {
    return (
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 10,
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500 }}>Novo insumo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="field">
            <label>Categoria *</label>
            <select
              className="select"
              data-testid="select-nova-categoria-insumo"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Escolha…</option>
              <optgroup label="Cortes (cor vem da variante)">
                {cutCategories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cor fixa">
                {FIXED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="field">
            <label>{isCutCategory ? 'Nome da peça *' : 'Nome do insumo *'}</label>
            <input
              className="input"
              data-testid="input-novo-insumo-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCutCategory ? 'Frente' : 'Zíper nº5 Dourado'}
            />
          </div>
        </div>

        {!isCutCategory && category && (
          <div className="field" style={{ maxWidth: 160 }}>
            <label>Unidade</label>
            <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        )}

        {isCutCategory && (
          <div className="cust-meta">
            A cor não entra aqui: ela vem da variante. O estoque desta peça por cor é criado
            depois, pelo botão de cortes pendentes.
          </div>
        )}

        {error && <div style={{ fontSize: 11.5, color: 'var(--red)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn sm primary"
            type="button"
            data-testid="btn-criar-insumo"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Criar e adicionar'}
          </button>
          <button
            className="btn sm ghost"
            type="button"
            onClick={() => {
              setCreating(false)
              setError(null)
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <select
      className="select"
      data-testid="select-bom-material"
      style={{ width: '100%' }}
      value=""
      onChange={(e) => {
        const v = e.target.value
        if (!v) return
        if (v === CREATE_VALUE) {
          setCreating(true)
          return
        }
        const picked = available.find((o) => optionKey(o) === v)
        if (picked) onPick(picked)
      }}
    >
      <option value="">+ Adicionar insumo…</option>
      {cuts.length > 0 && (
        <optgroup label="Cortes (cor vem da variante)">
          {cuts.map((o) => (
            <option key={optionKey(o)} value={optionKey(o)}>
              {o.category} › {o.type}
            </option>
          ))}
        </optgroup>
      )}
      {fixed.length > 0 && (
        <optgroup label="Aplicações · Metais · Aviamentos">
          {fixed.map((o) => (
            <option key={optionKey(o)} value={optionKey(o)}>
              {o.category} › {o.type} ({o.unit})
            </option>
          ))}
        </optgroup>
      )}
      <option value={CREATE_VALUE}>+ Criar novo insumo…</option>
    </select>
  )
}
