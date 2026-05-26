"use client" // mobile menu open/close state (useState) + cart item count

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, ShoppingBag, User, Heart } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/lib/cart-context"

const NAV_LINKS = [
  { label: "Lançamentos", href: "/lancamentos" },
  { label: "Bolsas",      href: "/bolsas" },
  { label: "Vestuário",   href: "/vestuario" },
  { label: "Bazar",       href: "/bazar" },
  { label: "Afiliados",   href: "/afiliadas" },
  { label: "Sobre nós",   href: "/sobre" },
] as const

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { cart, hydrated } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-container items-center justify-between px-margin-mobile md:px-margin-desktop">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center transition-opacity hover:opacity-80"
          aria-label="Patrícia Carreira — página inicial"
        >
          <Image
            src="/images/logo/logo oficial.png"
            alt="Patrícia Carreira"
            width={80}
            height={64}
            className="h-14 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Favoritos */}
          <Button variant="ghost" size="icon" aria-label="Peças favoritas" asChild>
            <Link href="/conta/favoritos">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>

          {/* Perfil */}
          <Button variant="ghost" size="icon" aria-label="Minha conta" asChild>
            <Link href="/conta">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          {/* Carrinho */}
          <Button variant="ghost" size="icon" aria-label="Carrinho" asChild>
            <Link href="/carrinho" className="relative">
              <ShoppingBag className="h-5 w-5" />
              {hydrated && cart.item_count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-caption text-caption text-on-primary text-[10px] leading-none">
                  {cart.item_count > 9 ? "9+" : cart.item_count}
                </span>
              )}
            </Link>
          </Button>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu"
                id="btn-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <Separator />
              <nav className="flex flex-col gap-1 pt-2" aria-label="Navegação mobile">
                {NAV_LINKS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded px-3 py-2 font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
