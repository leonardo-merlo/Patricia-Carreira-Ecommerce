"use client" // usePathname — o item ativo do menu depende da rota atual

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, MapPin, ShoppingBag, Heart, LogOut, type LucideIcon } from "lucide-react"
import { signOut } from "@/lib/actions/auth"

type ItemMenu = {
  href: string
  label: string
  icon: LucideIcon
  id: string
}

const ITENS: ItemMenu[] = [
  { href: "/conta", label: "Dados pessoais", icon: User, id: "menu-dados-pessoais" },
  { href: "/conta/enderecos", label: "Endereços", icon: MapPin, id: "menu-enderecos" },
  { href: "/conta/pedidos", label: "Pedidos", icon: ShoppingBag, id: "menu-pedidos" },
  { href: "/conta/favoritos", label: "Favoritos", icon: Heart, id: "menu-favoritos" },
]

/** Iniciais da cliente para o avatar; cai no ícone quando não há nome. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ""
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function ContaSidebar({ name, email }: { name: string | null; email: string }) {
  const pathname = usePathname()
  const nomeCompleto = (name ?? "").trim()
  const primeiroNome = nomeCompleto.split(/\s+/)[0] ?? ""
  const sigla = iniciais(nomeCompleto)

  return (
    <aside className="md:sticky md:top-24 md:self-start">
      {/* Avatar + saudação */}
      <div className="flex items-center gap-3 border-b border-outline-variant pb-5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed"
          aria-hidden="true"
        >
          {sigla ? (
            <span className="font-label-md text-label-md text-primary">{sigla}</span>
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-headline-sm text-headline-sm text-on-surface">
            {primeiroNome ? `Olá, ${primeiroNome}` : "Minha conta"}
          </p>
          <p className="truncate font-caption text-caption text-on-surface-variant">{email}</p>
        </div>
      </div>

      {/* Menu — no mobile vira uma faixa rolável com sublinhado no ativo */}
      <nav
        aria-label="Menu da conta"
        className="mt-5 flex gap-1 overflow-x-auto md:mt-6 md:flex-col md:gap-0 md:overflow-x-visible"
      >
        {ITENS.map((item) => {
          const ativo =
            item.href === "/conta" ? pathname === "/conta" : pathname.startsWith(item.href)
          const Icone = item.icon

          return (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={[
                "flex shrink-0 items-center gap-3 whitespace-nowrap px-4 py-3 font-label-md text-label-md transition-colors",
                "border-b-2 md:border-b-0 md:border-l-2 md:px-4",
                ativo
                  ? "border-primary text-primary md:bg-surface-container-low"
                  : "border-transparent text-on-surface-variant hover:border-outline-variant hover:text-on-surface",
              ].join(" ")}
            >
              <Icone className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <form action={signOut} className="contents">
          <button
            type="submit"
            id="menu-sair"
            className="flex shrink-0 items-center gap-3 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-left font-label-md text-label-md text-on-surface-variant transition-colors hover:border-outline-variant hover:text-on-surface md:border-b-0 md:border-l-2 md:px-4"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </form>
      </nav>
    </aside>
  )
}
