import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ContaSidebar } from "@/components/conta/conta-sidebar"

/**
 * Casca da área da cliente: menu lateral fixo + conteúdo da página.
 *
 * Vive num route group para não alcançar /conta/entrar, /conta/cadastrar e as
 * telas de senha — essas continuam fora do painel, sem menu.
 */
export default async function PainelContaLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/conta/entrar")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-12 md:px-margin-desktop md:py-16">
      <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-14">
        <ContaSidebar name={profile?.name ?? null} email={user.email ?? ""} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
