"use client" // newsletter form submit prevents default page reload

import Link from "next/link"
import { Instagram } from "lucide-react"

const STORE_LINKS = [
  { label: "Lançamentos", href: "/lancamentos" },
  { label: "Bolsas",      href: "/bolsas" },
  { label: "Vestuário",   href: "/vestuario" },
  { label: "Bazar",       href: "/bazar" },
  { label: "Sobre nós",   href: "/sobre" },
]

const INFO_LINKS = [
  { label: "Sobre nós",          href: "/sobre" },
  { label: "FAQ",                 href: "/faq" },
  { label: "Política de trocas", href: "/politica-de-trocas" },
  { label: "Política de envio",  href: "/politica-de-envio" },
  { label: "Privacidade",        href: "/privacidade" },
]

export function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto max-w-container px-margin-mobile py-12 md:px-margin-desktop">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2">
            <p className="font-headline-sm text-headline-sm text-on-surface">
              Patrícia Carreira
            </p>
            <p className="mt-2 max-w-xs font-body-md text-body-md text-on-surface-variant">
              Arte em movimento. Cada peça é única.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://www.instagram.com/patriciacarreira_/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Patrícia Carreira"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Loja */}
          <div>
            <p className="mb-4 font-label-md text-label-md text-on-surface">Loja</p>
            <ul className="space-y-2">
              {STORE_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Informações */}
          <div>
            <p className="mb-4 font-label-md text-label-md text-on-surface">Informações</p>
            <ul className="space-y-2">
              {INFO_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-outline-variant pt-6">
          <p className="font-caption text-caption text-on-surface-variant">
            © {new Date().getFullYear()} Patrícia Carreira. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
