"use client" // estado do formulário + busca de CEP no ViaCEP

import { useState } from "react"
import { Loader2, Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateCustomerAddress } from "@/lib/actions/auth"

export type Endereco = {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip: string
}

const VAZIO: Endereco = {
  street: "",
  number: "",
  complement: null,
  neighborhood: "",
  city: "",
  state: "",
  zip: "",
}

function formatarCep(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2")
}

function Rotulo({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-caption text-caption uppercase tracking-widest text-on-surface-variant"
    >
      {children}
    </label>
  )
}

export function EnderecoForm({ currentAddress }: { currentAddress: Endereco | null }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Endereco>(currentAddress ?? VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erro, setErro] = useState("")

  function set(campo: keyof Endereco, valor: string): void {
    setForm((prev) => ({ ...prev, [campo]: valor || null }))
  }

  async function handleCepBlur(): Promise<void> {
    const digitos = form.zip.replace(/\D/g, "")
    if (digitos.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      const data: {
        erro?: boolean
        logradouro?: string
        bairro?: string
        localidade?: string
        uf?: string
      } = await res.json()
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
      // silencioso — a cliente preenche à mão
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSalvar(): Promise<void> {
    if (
      !form.street ||
      !form.number ||
      !form.neighborhood ||
      !form.city ||
      !form.state ||
      !form.zip
    ) {
      setErro("Preencha todos os campos obrigatórios")
      return
    }
    setSalvando(true)
    setErro("")
    const resultado = await updateCustomerAddress(form)
    setSalvando(false)
    if (resultado.ok) {
      setEditando(false)
    } else {
      setErro(resultado.error)
    }
  }

  function handleCancelar(): void {
    setForm(currentAddress ?? VAZIO)
    setErro("")
    setEditando(false)
  }

  if (!editando) {
    const temEndereco = Boolean(currentAddress?.street)

    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Endereço de entrega
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditando(true)}
            id="btn-editar-endereco"
          >
            <Pencil className="mr-2 h-4 w-4" />
            {temEndereco ? "Editar" : "Adicionar"}
          </Button>
        </div>

        {temEndereco && currentAddress ? (
          <address className="mt-5 font-body-md text-body-md not-italic text-on-surface">
            {currentAddress.street}, {currentAddress.number}
            {currentAddress.complement ? `, ${currentAddress.complement}` : ""}
            <br />
            {currentAddress.neighborhood} · {currentAddress.city}/{currentAddress.state}
            <br />
            CEP {currentAddress.zip}
          </address>
        ) : (
          <p className="mt-5 font-body-md text-body-md text-on-surface-variant">
            Você ainda não salvou um endereço. Adicione um para agilizar seus próximos pedidos.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6">
      <h2 className="font-headline-sm text-headline-sm text-on-surface">Endereço de entrega</h2>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="col-span-1">
          <Rotulo htmlFor="cep">CEP *</Rotulo>
          <div className="relative mt-1.5">
            <Input
              id="cep"
              value={form.zip}
              onChange={(e) => set("zip", formatarCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
              autoComplete="postal-code"
            />
            {buscandoCep && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-on-surface-variant" />
            )}
          </div>
        </div>

        <div className="col-span-2">
          <Rotulo htmlFor="street">Rua *</Rotulo>
          <Input
            id="street"
            className="mt-1.5"
            value={form.street}
            onChange={(e) => set("street", e.target.value)}
            placeholder="Nome da rua"
            autoComplete="address-line1"
          />
        </div>

        <div className="col-span-1">
          <Rotulo htmlFor="number">Número *</Rotulo>
          <Input
            id="number"
            className="mt-1.5"
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
            placeholder="123"
          />
        </div>

        <div className="col-span-2">
          <Rotulo htmlFor="complement">Complemento</Rotulo>
          <Input
            id="complement"
            className="mt-1.5"
            value={form.complement ?? ""}
            onChange={(e) => set("complement", e.target.value)}
            placeholder="Apto, bloco... (opcional)"
            autoComplete="address-line2"
          />
        </div>

        <div className="col-span-2">
          <Rotulo htmlFor="neighborhood">Bairro *</Rotulo>
          <Input
            id="neighborhood"
            className="mt-1.5"
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            placeholder="Bairro"
          />
        </div>

        <div className="col-span-1">
          <Rotulo htmlFor="state">UF *</Rotulo>
          <Input
            id="state"
            className="mt-1.5"
            value={form.state}
            onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="BA"
            maxLength={2}
          />
        </div>

        <div className="col-span-3">
          <Rotulo htmlFor="city">Cidade *</Rotulo>
          <Input
            id="city"
            className="mt-1.5"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Cidade"
          />
        </div>
      </div>

      {erro && <p className="mt-4 font-caption text-caption text-error">{erro}</p>}

      <div className="mt-6 flex gap-2">
        <Button onClick={handleSalvar} disabled={salvando} id="btn-salvar-endereco">
          {salvando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
        <Button variant="ghost" onClick={handleCancelar} disabled={salvando}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}
