"use client" // form state, supabase auth, router redirect

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CadastrarPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error) {
      setError(
        error.message === "User already registered"
          ? "Este email já tem uma conta. Tente entrar."
          : "Não foi possível criar a conta. Tente novamente."
      )
      setLoading(false)
      return
    }

    router.push("/conta")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Minha conta
          </p>
          <h1 className="mt-3 font-headline-lg text-on-surface">
            Criar conta
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Já tem conta?{" "}
            <Link
              href="/conta/entrar"
              className="text-primary underline underline-offset-2"
            >
              Entrar
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block font-label-sm text-label-sm text-on-surface"
            >
              Nome completo
            </label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Seu nome"
            />
          </div>

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
            <label
              htmlFor="password"
              className="mb-1.5 block font-label-sm text-label-sm text-on-surface"
            >
              Senha
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="mínimo 6 caracteres"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <label htmlFor="terms" className="font-body-sm text-body-sm text-on-surface-variant">
              Li e aceito os{" "}
              <Link href="/termos" className="text-primary underline underline-offset-2">Termos de Uso</Link>
              {" "}e a{" "}
              <Link href="/privacidade" className="text-primary underline underline-offset-2">Política de Privacidade</Link>
            </label>
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={loading || !accepted}
            id="btn-criar-conta"
          >
            {loading ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>
      </div>
    </div>
  )
}
