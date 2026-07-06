"use client" // form state, supabase auth, router redirect

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function EntrarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Aceita apenas caminhos internos — "//" e URLs absolutas permitiriam
  // redirecionar o usuário para um site externo após o login (open redirect)
  const rawNext = searchParams.get("next") ?? "/conta"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/conta"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Email ou senha incorretos.")
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
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

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="password"
            className="font-label-sm text-label-sm text-on-surface"
          >
            Senha
          </label>
          <Link
            href="/conta/recuperar-senha"
            className="font-label-sm text-label-sm text-primary underline underline-offset-2"
          >
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
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
        id="btn-entrar"
      >
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  )
}

export default function EntrarPage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Minha conta
          </p>
          <h1 className="mt-3 font-headline-lg text-on-surface">
            Acesse sua conta
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Não tem conta?{" "}
            <Link
              href="/conta/cadastrar"
              className="text-primary underline underline-offset-2"
            >
              Criar gratuitamente
            </Link>
          </p>
        </div>

        <Suspense>
          <EntrarForm />
        </Suspense>
      </div>
    </div>
  )
}
