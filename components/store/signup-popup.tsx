"use client" // localStorage check, auth state, form state

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

const POPUP_KEY = "pc_popup_dismissed"
const COUPON_CODE = "PRIMEIRACOMPRA10"
const DELAY_MS = 3000

export function SignupPopup() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "success">("form")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [successName, setSuccessName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(POPUP_KEY)) return

    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout>

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) return
      timer = setTimeout(() => setOpen(true), DELAY_MS)
    })

    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    localStorage.setItem(POPUP_KEY, "1")
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone, cpf },
      },
    })

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Este e-mail já tem uma conta. Faça login para acessar seus benefícios."
          : "Não foi possível criar a conta. Tente novamente."
      )
      setLoading(false)
      return
    }

    setSuccessName(name.split(" ")[0])
    localStorage.setItem(POPUP_KEY, "1")
    setStep("success")
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss() }}>
      <DialogContent className="max-h-[95dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto p-0">
        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/20 p-1 text-white transition-opacity hover:opacity-80"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "form" ? (
          <>
            {/* Header brand */}
            <div className="bg-primary px-6 py-8 text-center text-on-primary">
              <p className="font-label-md text-label-md uppercase tracking-widest opacity-80">
                Patrícia Carreira
              </p>
              <h2 className="mt-3 font-headline-sm text-headline-sm leading-tight">
                GARANTA 10% OFF
                <br />+ FRETE GRÁTIS
              </h2>
              <p className="mt-1 font-headline-sm text-headline-sm">
                NA SUA PRIMEIRA COMPRA ✨
              </p>
            </div>

            {/* Form area */}
            <div className="px-6 py-6">
              <p className="mb-5 text-center font-body-md text-body-md text-on-surface-variant">
                Cadastre-se para ter uma experiência mais completa e acesso a benefícios exclusivos.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                  type="text"
                  placeholder="Nome completo"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-label="Nome completo"
                />
                <Input
                  type="tel"
                  placeholder="WhatsApp: (00) 00000-0000"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  aria-label="WhatsApp"
                />
                <Input
                  type="text"
                  placeholder="CPF: 000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  required
                  aria-label="CPF"
                />
                <Input
                  type="email"
                  placeholder="E-mail"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="E-mail"
                />
                <Input
                  type="password"
                  placeholder="Senha (mín. 6 caracteres)"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  aria-label="Senha"
                />

                {error && (
                  <p role="alert" className="text-sm text-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-1 w-full"
                  disabled={loading}
                  id="btn-popup-ativar-cupom"
                >
                  {loading ? "Cadastrando…" : "ATIVAR CUPOM"}
                </Button>
              </form>

              <p className="mt-4 text-center font-caption text-caption text-on-surface-variant">
                Já tem conta?{" "}
                <Link
                  href="/conta/entrar"
                  onClick={dismiss}
                  className="text-primary underline underline-offset-2"
                >
                  Fazer login
                </Link>
              </p>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="px-6 py-10 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
              ✨
            </div>

            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Bem-vinda{successName ? `, ${successName}` : ""}!
            </h2>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              Seu cupom exclusivo está ativo:
            </p>

            <div className="my-5 rounded-lg border-2 border-dashed border-primary bg-primary/5 px-4 py-3">
              <p className="font-label-md text-label-md tracking-widest text-primary">
                {COUPON_CODE}
              </p>
            </div>

            <div className="mb-6 flex flex-col gap-2 text-left">
              <p className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                <span className="text-[#25D366]">✓</span> 10% OFF na primeira compra
              </p>
              <p className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                <span className="text-[#25D366]">✓</span> Frete grátis na primeira compra
              </p>
            </div>

            <p className="mb-6 font-caption text-caption text-on-surface-variant">
              Use o cupom no carrinho ao finalizar sua compra.
            </p>

            <Button size="lg" className="w-full" onClick={dismiss} id="btn-popup-continuar">
              CONTINUAR COMPRANDO
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
