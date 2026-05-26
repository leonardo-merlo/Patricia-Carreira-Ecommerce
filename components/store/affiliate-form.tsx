"use client" // form state: loading/success/error, phone mask, message char counter

import { useState, useTransition } from "react"
import { ArrowRight } from "lucide-react"
import { createAffiliateApplication } from "@/lib/actions/partners"

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`
}

const inputClass =
  "w-full rounded border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"

export function AffiliateForm() {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createAffiliateApplication({
        name: fd.get("nome") as string,
        email: fd.get("email") as string,
        phone,
        instagram: (fd.get("instagram") as string) || undefined,
        city: fd.get("cidade") as string,
        howFound: fd.get("como_conheceu") as string,
        message: message || undefined,
      })
      setStatus(result.success ? "success" : "error")
    })
  }

  if (status === "success") {
    return (
      <div className="rounded-xl bg-white p-10 shadow-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f5ede0]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-8 w-8"
            stroke="#6b4900"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Cadastro recebido!
        </p>
        <p className="mt-3 font-body-lg text-body-lg text-on-surface-variant">
          Entraremos em contato pelo seu WhatsApp em breve.
          <br />
          Obrigada por fazer parte!
        </p>
      </div>
    )
  }

  return (
    <form
      id="form-afiliadas"
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl bg-white p-8 shadow-md"
    >
      <div className="space-y-1.5">
        <label
          htmlFor="campo-nome"
          className="block font-label-md text-label-md text-on-surface"
        >
          Nome completo <span className="text-primary">*</span>
        </label>
        <input
          id="campo-nome"
          name="nome"
          type="text"
          required
          disabled={isPending}
          placeholder="Seu nome completo"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="campo-email"
          className="block font-label-md text-label-md text-on-surface"
        >
          E-mail <span className="text-primary">*</span>
        </label>
        <input
          id="campo-email"
          name="email"
          type="email"
          required
          disabled={isPending}
          placeholder="seu@email.com"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="campo-whatsapp"
          className="block font-label-md text-label-md text-on-surface"
        >
          WhatsApp <span className="text-primary">*</span>
        </label>
        <input
          id="campo-whatsapp"
          name="whatsapp"
          type="tel"
          required
          disabled={isPending}
          placeholder="(22) 9 9999-9999"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="campo-instagram"
          className="block font-label-md text-label-md text-on-surface"
        >
          Instagram{" "}
          <span className="font-normal text-on-surface-variant">(opcional)</span>
        </label>
        <input
          id="campo-instagram"
          name="instagram"
          type="text"
          disabled={isPending}
          placeholder="@seuperfil"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="campo-cidade"
          className="block font-label-md text-label-md text-on-surface"
        >
          Cidade e Estado <span className="text-primary">*</span>
        </label>
        <input
          id="campo-cidade"
          name="cidade"
          type="text"
          required
          disabled={isPending}
          placeholder="Ex: Arraial d'Ajuda, BA"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="campo-como-conheceu"
          className="block font-label-md text-label-md text-on-surface"
        >
          Como você conheceu a Patrícia Carreira? <span className="text-primary">*</span>
        </label>
        <select
          id="campo-como-conheceu"
          name="como_conheceu"
          required
          disabled={isPending}
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled>
            Selecione uma opção
          </option>
          <option value="Instagram">Instagram</option>
          <option value="Indicação de uma amiga">Indicação de uma amiga</option>
          <option value="Loja física">Loja física</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="campo-mensagem"
          className="block font-label-md text-label-md text-on-surface"
        >
          Conta um pouco sobre você e sua relação com a marca{" "}
          <span className="font-normal text-on-surface-variant">(opcional)</span>
        </label>
        <textarea
          id="campo-mensagem"
          name="mensagem"
          disabled={isPending}
          placeholder="Compartilhe sua história..."
          maxLength={500}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputClass} resize-none`}
        />
        <p className="text-right font-caption text-caption text-on-surface-variant">
          {message.length}/500
        </p>
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="rounded bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          Algo deu errado. Tente novamente ou entre em contato pelo WhatsApp.
        </p>
      )}

      <button
        id="btn-enviar-cadastro"
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded bg-primary px-6 py-4 font-label-md text-label-md uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Enviando...
          </>
        ) : (
          <>
            Enviar Cadastro
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  )
}
