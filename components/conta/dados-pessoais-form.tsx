"use client" // estado do formulário: alterna leitura/edição e guarda o rascunho

import { useState } from "react"
import { Pencil, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updatePersonalData } from "@/lib/actions/profile"

export type DadosPessoaisIniciais = {
  name: string
  email: string
  cpf: string | null
  phone: string | null
  /** ISO `AAAA-MM-DD`, como vem do Postgres e como o input[type=date] espera. */
  birthDate: string | null
  gender: string | null
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, só para exibição. */
function formatarData(iso: string | null): string | null {
  if (!iso) return null
  const [ano, mes, dia] = iso.slice(0, 10).split("-")
  if (!ano || !mes || !dia) return null
  return `${dia}/${mes}/${ano}`
}

function formatarCpf(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
}

function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

function CampoLeitura({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <p className="font-caption text-caption uppercase tracking-widest text-on-surface-variant">
        {rotulo}
      </p>
      <p className="mt-1 font-body-md text-body-md text-on-surface">
        {valor ? valor : <span className="text-on-surface-variant">Não informado</span>}
      </p>
    </div>
  )
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

export function DadosPessoaisForm({ iniciais }: { iniciais: DadosPessoaisIniciais }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(iniciais.name)
  const [cpf, setCpf] = useState(formatarCpf(iniciais.cpf ?? ""))
  const [telefone, setTelefone] = useState(formatarTelefone(iniciais.phone ?? ""))
  const [nascimento, setNascimento] = useState(iniciais.birthDate?.slice(0, 10) ?? "")
  const [genero, setGenero] = useState(iniciais.gender ?? "")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  async function handleSalvar() {
    if (!nome.trim()) {
      setErro("O nome não pode ficar vazio")
      return
    }
    setSalvando(true)
    setErro("")
    const resultado = await updatePersonalData({
      name: nome,
      cpf: cpf || null,
      phone: telefone || null,
      birthDate: nascimento || null,
      gender: genero || null,
    })
    setSalvando(false)
    if (resultado.ok) {
      setEditando(false)
    } else {
      setErro(resultado.error)
    }
  }

  function handleCancelar() {
    setNome(iniciais.name)
    setCpf(formatarCpf(iniciais.cpf ?? ""))
    setTelefone(formatarTelefone(iniciais.phone ?? ""))
    setNascimento(iniciais.birthDate?.slice(0, 10) ?? "")
    setGenero(iniciais.gender ?? "")
    setErro("")
    setEditando(false)
  }

  if (!editando) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Meus dados</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditando(true)}
            id="btn-editar-dados-pessoais"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <CampoLeitura rotulo="Nome completo" valor={iniciais.name} />
          <CampoLeitura rotulo="E-mail" valor={iniciais.email} />
          <CampoLeitura rotulo="CPF" valor={formatarCpf(iniciais.cpf ?? "") || null} />
          <CampoLeitura rotulo="Telefone" valor={formatarTelefone(iniciais.phone ?? "") || null} />
          <CampoLeitura rotulo="Data de nascimento" valor={formatarData(iniciais.birthDate)} />
          <CampoLeitura rotulo="Gênero" valor={iniciais.gender} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6">
      <h2 className="font-headline-sm text-headline-sm text-on-surface">Editar meus dados</h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Rotulo htmlFor="campo-nome">Nome completo *</Rotulo>
          <Input
            id="campo-nome"
            className="mt-1.5"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome e sobrenome"
            autoComplete="name"
          />
        </div>

        <div>
          <Rotulo htmlFor="campo-email">E-mail</Rotulo>
          <Input
            id="campo-email"
            className="mt-1.5"
            value={iniciais.email}
            disabled
            readOnly
            autoComplete="email"
          />
          <p className="mt-1 font-caption text-caption text-on-surface-variant">
            O e-mail é o seu login e não pode ser alterado por aqui.
          </p>
        </div>

        <div>
          <Rotulo htmlFor="campo-cpf">CPF</Rotulo>
          <Input
            id="campo-cpf"
            className="mt-1.5"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
          />
        </div>

        <div>
          <Rotulo htmlFor="campo-telefone">Telefone</Rotulo>
          <Input
            id="campo-telefone"
            className="mt-1.5"
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            maxLength={15}
            autoComplete="tel"
          />
        </div>

        <div>
          <Rotulo htmlFor="campo-nascimento">Data de nascimento</Rotulo>
          <Input
            id="campo-nascimento"
            className="mt-1.5"
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
          />
          <p className="mt-1 font-caption text-caption text-on-surface-variant">Opcional.</p>
        </div>

        <div>
          <Rotulo htmlFor="campo-genero">Gênero</Rotulo>
          <Input
            id="campo-genero"
            className="mt-1.5"
            value={genero}
            onChange={(e) => setGenero(e.target.value)}
            placeholder="Como você prefere ser identificada"
            maxLength={40}
          />
          <p className="mt-1 font-caption text-caption text-on-surface-variant">Opcional.</p>
        </div>
      </div>

      {erro && <p className="mt-4 font-caption text-caption text-error">{erro}</p>}

      <div className="mt-6 flex gap-2">
        <Button onClick={handleSalvar} disabled={salvando} id="btn-salvar-dados-pessoais">
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
