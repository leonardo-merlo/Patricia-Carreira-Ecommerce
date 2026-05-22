import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShoppingBag, Heart, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { signOut } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UpdateNameForm } from "./update-name-form"

export const metadata: Metadata = {
  title: "Minha Conta | Patrícia Carreira",
  description: "Acesse seus pedidos, favoritos e dados da sua conta.",
}

export default async function ContaPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/conta/entrar")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name")
    .eq("id", user.id)
    .single()

  const displayName = profile?.name ?? user.email

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Minha conta
          </p>
          <div className="mt-2">
            <UpdateNameForm currentName={displayName ?? ""} />
          </div>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            {user.email}
          </p>
        </div>

        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit" id="btn-sair">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>

      <Separator className="my-10" />

      {/* Atalhos */}
      <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/conta/pedidos"
          className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-5 transition-colors hover:bg-surface-container"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm text-on-surface">
              Meus pedidos
            </p>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              Ver histórico completo
            </p>
          </div>
        </Link>

        <Link
          href="/conta/favoritos"
          className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-5 transition-colors hover:bg-surface-container"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm text-on-surface">
              Favoritos
            </p>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              Peças salvas
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
