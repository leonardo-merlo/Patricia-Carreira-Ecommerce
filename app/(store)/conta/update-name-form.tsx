"use client" // form state

import { useState } from "react"
import { Pencil, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateProfileName } from "@/lib/actions/auth"

export function UpdateNameForm({ currentName }: { currentName: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (value.trim() === currentName) { setEditing(false); return }
    setSaving(true)
    setError("")
    const result = await updateProfileName(value)
    setSaving(false)
    if (result.ok) {
      setEditing(false)
    } else {
      setError(result.error)
    }
  }

  function handleCancel() {
    setValue(currentName)
    setError("")
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex items-center gap-2 text-left"
        aria-label="Editar nome"
      >
        <span className="font-headline-lg text-on-surface">{currentName}</span>
        <Pencil className="h-4 w-4 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
          autoFocus
          className="h-9 max-w-xs font-headline-sm text-headline-sm"
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={saving} aria-label="Salvar">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-primary" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel} disabled={saving} aria-label="Cancelar">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="font-caption text-caption text-error">{error}</p>}
    </div>
  )
}
