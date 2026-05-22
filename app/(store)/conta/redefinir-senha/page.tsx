"use client" // form state, supabase updateUser, router redirect

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function RedefinirSenhaPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError("Não foi possível redefinir a senha. O link pode ter expirado.")
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
            Nova senha
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-label-sm text-label-sm text-on-surface"
            >
              Nova senha
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

          <div>
            <label
              htmlFor="confirm"
              className="mb-1.5 block font-label-sm text-label-sm text-on-surface"
            >
              Confirmar nova senha
            </label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              placeholder="repita a senha"
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
            id="btn-redefinir-senha"
          >
            {loading ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </div>
  )
}
