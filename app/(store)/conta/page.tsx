import type { Metadata } from "next"
import Link from "next/link"
import { User, ShoppingBag, Heart, MapPin, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Minha Conta | Patrícia Carreira",
  description: "Acesse sua conta para ver seus pedidos, favoritos e gerenciar seus dados.",
}

const ACCOUNT_FEATURES = [
  {
    icon: ShoppingBag,
    title: "Histórico de pedidos",
    body: "Acompanhe o status de cada pedido e acesse suas notas fiscais.",
  },
  {
    icon: Heart,
    title: "Lista de favoritos",
    body: "Salve as peças que você quer e seja notificada de disponibilidade.",
  },
  {
    icon: MapPin,
    title: "Endereços salvos",
    body: "Cadastre seus endereços e agilize o checkout na próxima compra.",
  },
]

export default function ContaPage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Minha conta
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Bem-vinda de volta
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Entre na sua conta para ver seus pedidos, favoritos e muito mais.
        </p>
      </div>

      <Separator className="my-12" />

      {/* Login / Criar conta */}
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-8">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed mx-auto">
            <Lock className="h-6 w-6 text-primary" />
          </div>

          <h2 className="text-center font-headline-sm text-headline-sm text-on-surface">
            Acesse sua conta
          </h2>
          <p className="mt-2 text-center font-body-md text-body-md text-on-surface-variant">
            Cadastro e login estarão disponíveis em breve. Por enquanto, você pode
            continuar comprando sem criar uma conta.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="lg" className="w-full" id="btn-entrar">
              <Link href="/checkout">
                Ir para o checkout
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full" id="btn-criar-conta">
              <Link href="/">
                Continuar navegando
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-12" />

      {/* O que você vai ter acesso */}
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center font-headline-sm text-headline-sm text-on-surface">
          O que você vai encontrar aqui
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ACCOUNT_FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl bg-surface-container-low p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-headline-sm text-headline-sm text-on-surface">{title}</p>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
