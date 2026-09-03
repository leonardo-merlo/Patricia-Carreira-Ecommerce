import Link from "next/link"
import { Instagram } from "lucide-react"
import { formatCnpj } from '@/lib/documento'
import { getStoreSettings } from "@/lib/server/store-settings"

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
  { label: "Termos de uso",      href: "/termos" },
]

export async function Footer() {
  const settings = await getStoreSettings().catch(() => null)
  const cnpj = formatCnpj(settings?.cnpj)
  const address = settings?.address_full

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
              Bolsas e roupas com bordado autoral. Loja em Arraial d&apos;Ajuda,
              envio para todo o Brasil.
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
        <div className="mt-8 border-t border-outline-variant pt-6 space-y-1">
          <p className="font-caption text-caption text-on-surface-variant">
            © {new Date().getFullYear()} Patrícia Carreira. Todos os direitos reservados.
          </p>
          {(cnpj || address) && (
            <p className="font-caption text-caption text-on-surface-variant opacity-70">
              {cnpj && <>CNPJ: {cnpj}</>}
              {cnpj && address && " · "}
              {address}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}
