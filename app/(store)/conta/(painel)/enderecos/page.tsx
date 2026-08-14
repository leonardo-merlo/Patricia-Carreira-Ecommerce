import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EnderecoForm, type Endereco } from "@/components/conta/endereco-form"

export const metadata: Metadata = {
  title: "Endereços | Patrícia Carreira",
  description: "Gerencie o endereço de entrega dos seus pedidos.",
}

export default async function EnderecosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/conta/entrar?redirect=/conta/enderecos")

  const { data: customer } = await supabase
    .from("customers")
    .select("address")
    .eq("user_id", user.id)
    .maybeSingle()

  const endereco = (customer?.address ?? null) as Endereco | null

  return (
    <section>
      <header className="mb-8">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Minha conta
        </p>
        <h1 className="mt-2 font-headline-md text-headline-md text-on-surface">Endereços</h1>
      </header>

      <EnderecoForm currentAddress={endereco} />
    </section>
  )
}
