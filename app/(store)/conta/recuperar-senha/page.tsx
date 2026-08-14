"use client" // form state, supabase auth

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    // A base vem de NEXT_PUBLIC_APP_URL (URL de produção, a mesma cadastrada na
    // lista de redirects do Supabase). window.location.origin só entra como
    // fallback de desenvolvimento: em preview ou localhost o link do e-mail
    // apontaria para um domínio que o Supabase recusa.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "")
    // Passa pelo /auth/callback porque é lá que o code do e-mail vira sessão
    // (cookie) antes de a página de nova senha renderizar.
    const redirectTo = `${baseUrl}/auth/callback?next=/conta/redefinir-senha`

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })

    if (error) {
      setError("Não foi possível enviar o email. Tente novamente.")
      setLoading(false)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
        <div className="mx-auto max-w-md text-center">
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Recuperar senha
          </p>
          <h1 className="mt-3 font-headline-lg text-on-surface">
            Email enviado
          </h1>
          <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
            Verifique sua caixa de entrada em{" "}
            <span className="font-medium text-on-surface">{email}</span> e clique
            no link para criar uma nova senha.
          </p>
          <p className="mt-6">
            <Link
              href="/conta/entrar"
              className="font-label-md text-label-md text-primary underline underline-offset-2"
            >
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Minha conta
          </p>
          <h1 className="mt-3 font-headline-lg text-on-surface">
            Recuperar senha
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Informe seu email e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block font-label-sm text-label-sm text-on-surface"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={loading}
          >
            {loading ? "Enviando…" : "Enviar link de recuperação"}
          </Button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Lembrou a senha?{" "}
            <Link
              href="/conta/entrar"
              className="text-primary underline underline-offset-2"
            >
              Voltar ao login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
