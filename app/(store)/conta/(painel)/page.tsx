import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DadosPessoaisForm } from "@/components/conta/dados-pessoais-form"

export const metadata: Metadata = {
  title: "Dados pessoais | Patrícia Carreira",
  description: "Consulte e atualize os dados da sua conta.",
}

export default async function DadosPessoaisPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/conta/entrar")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, cpf, phone, birth_date, gender")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <section>
      <header className="mb-8">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Minha conta
        </p>
        <h1 className="mt-2 font-headline-md text-headline-md text-on-surface">Dados pessoais</h1>
      </header>

      <DadosPessoaisForm
        iniciais={{
          name: profile?.name ?? "",
          email: user.email ?? "",
          cpf: profile?.cpf ?? null,
          phone: profile?.phone ?? null,
          birthDate: profile?.birth_date ?? null,
          gender: profile?.gender ?? null,
        }}
      />
    </section>
  )
}
