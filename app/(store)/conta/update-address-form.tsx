"use client" // form state + ViaCEP fetch

import { useState } from "react"
import { MapPin, Loader2, Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateCustomerAddress } from "@/lib/actions/auth"

type Address = {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip: string
}

const EMPTY: Address = {
  street: "",
  number: "",
  complement: null,
  neighborhood: "",
  city: "",
  state: "",
  zip: "",
}

function formatCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2")
}

export function UpdateAddressForm({ currentAddress }: { currentAddress: Address | null }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Address>(currentAddress ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState("")

  function set(field: keyof Address, value: string) {
    setForm((prev) => ({ ...prev, [field]: value || null }))
  }

  async function handleCepBlur() {
    const digits = form.zip.replace(/\D/g, "")
    if (digits.length !== 8) return
    setFetching(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro ?? prev.street,
          neighborhood: data.bairro ?? prev.neighborhood,
          city: data.localidade ?? prev.city,
          state: data.uf ?? prev.state,
        }))
      }
    } catch {
      // silently ignore — user fills manually
    } finally {
      setFetching(false)
    }
  }

  async function handleSave() {
    if (!form.street || !form.number || !form.neighborhood || !form.city || !form.state || !form.zip) {
      setError("Preencha todos os campos obrigatórios")
      return
    }
    setSaving(true)
    setError("")
    const result = await updateCustomerAddress(form)
    setSaving(false)
    if (result.ok) {
      setEditing(false)
    } else {
      setError(result.error)
    }
  }

  function handleCancel() {
    setForm(currentAddress ?? EMPTY)
    setError("")
    setEditing(false)
  }

  if (!editing) {
    const hasAddress = currentAddress?.street
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex w-full items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-5 text-left transition-colors hover:bg-surface-container"
        id="btn-editar-endereco"
        aria-label="Editar endereço de entrega"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-headline-sm text-headline-sm text-on-surface">
            Endereço de entrega
          </p>
          {hasAddress ? (
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              {currentAddress.street}, {currentAddress.number}
              {currentAddress.complement ? ` — ${currentAddress.complement}` : ""},{" "}
              {currentAddress.neighborhood} · {currentAddress.city}/{currentAddress.state} · {currentAddress.zip}
            </p>
          ) : (
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              Nenhum endereço salvo
            </p>
          )}
        </div>
        <Pencil className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
      <p className="mb-4 font-headline-sm text-headline-sm text-on-surface">
        Endereço de entrega
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-1">
          <p className="font-label-sm text-label-sm text-on-surface-variant">CEP *</p>
          <div className="relative mt-1">
            <Input
              id="cep"
              value={form.zip}
              onChange={(e) => set("zip", formatCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
            />
            {fetching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-on-surface-variant" />
            )}
          </div>
        </div>

        <div className="col-span-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Rua *</p>
          <Input
            id="street"
            className="mt-1"
            value={form.street}
            onChange={(e) => set("street", e.target.value)}
            placeholder="Nome da rua"
          />
        </div>

        <div className="col-span-1">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Número *</p>
          <Input
            id="number"
            className="mt-1"
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
            placeholder="123"
          />
        </div>

        <div className="col-span-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Complemento</p>
          <Input
            id="complement"
            className="mt-1"
            value={form.complement ?? ""}
            onChange={(e) => set("complement", e.target.value)}
            placeholder="Apto, bloco... (opcional)"
          />
        </div>

        <div className="col-span-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Bairro *</p>
          <Input
            id="neighborhood"
            className="mt-1"
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            placeholder="Bairro"
          />
        </div>

        <div className="col-span-1">
          <p className="font-label-sm text-label-sm text-on-surface-variant">UF *</p>
          <Input
            id="state"
            className="mt-1"
            value={form.state}
            onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="BA"
            maxLength={2}
          />
        </div>

        <div className="col-span-3">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Cidade *</p>
          <Input
            id="city"
            className="mt-1"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Cidade"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 font-caption text-caption text-error">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} id="btn-salvar-endereco">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}
