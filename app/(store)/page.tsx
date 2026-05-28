import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/store/product-card"
import { HeroCarousel } from "@/components/store/hero-carousel"
import { CitySection } from "@/components/store/city-section"
import { MOCK_PRODUCTS } from "@/lib/mock-data"

const CATEGORIES = [
  {
    name: "Lançamentos",
    href: "/lancamentos",
    description: "Novidades da coleção",
    image: "/images/products/imagens/produto_pagina_48_vestido_dani_0.jpeg",
    overlay: "bg-amber-900/35",
  },
  {
    name: "Bolsas",
    href: "/bolsas",
    description: "Tiracolo, tote, clutch",
    image: "/images/products/imagens/bolsa_flora_vinho_0.jpeg",
    overlay: "bg-red-900/35",
  },
  {
    name: "Vestuário",
    href: "/vestuario",
    description: "Vestidos, batas e mais",
    image: "/images/products/imagens/produto_pagina_79_bata_asteca_0.jpeg",
    overlay: "bg-blue-900/35",
  },
  {
    name: "Infantil",
    href: "/infantil",
    description: "Para as pequenas",
    image: "/images/products/imagens/produto_pagina_100_bata_bia_0.jpeg",
    overlay: "bg-pink-900/35",
  },
  {
    name: "Almofadas",
    href: "/almofadas",
    description: "Arte para o lar",
    image: "/images/products/imagens/produto_pagina_45_vestido_havana_0.jpeg",
    overlay: "bg-green-900/35",
  },
  {
    name: "Bazar",
    href: "/bazar",
    description: "Últimas peças",
    image: "/images/products/imagens/bolsa_nirvana_marinho_0.jpeg",
    overlay: "bg-orange-900/35",
  },
]

const FEATURED_SLUGS = [
  "bolsa-briana",
  "bolsa-maia",
  "bolsa-nirvana",
  "bolsa-romana",
  "pochete",
  "bolsa-liberty",
  "bolsa-mandala",
  "mochila-wood-stock",
  "vestido-havana",
  "vestido-dani",
  "vestido-fiji",
  "vestido-maia",
  "vestido-viena",
  "bata-asteca",
  "bata-yoko",
]

const slugOrder = new Map(FEATURED_SLUGS.map((s, i) => [s, i]))
const FEATURED = MOCK_PRODUCTS.filter((p) => FEATURED_SLUGS.includes(p.slug)).sort(
  (a, b) => (slugOrder.get(a.slug) ?? 99) - (slugOrder.get(b.slug) ?? 99),
)

export default function HomePage() {
  return (
    <>
      {/* Hero carousel */}
      <HeroCarousel />

      {/* Categorias */}
      <section className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
        <h2 className="mb-8 font-headline-sm text-headline-sm font-bold text-on-surface">Categorias</h2>

        <div className="grid grid-cols-2 gap-gutter md:grid-cols-3">
          {CATEGORIES.map(({ name, href, description, image, overlay }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex aspect-square flex-col overflow-hidden rounded-xl transition-opacity hover:opacity-90"
            >
              <Image
                src={image}
                alt={name}
                fill
                className="object-cover"
                aria-hidden
              />
              {/* Color tint over full card */}
              <div className={`absolute inset-0 ${overlay}`} />
              {/* Gradient at bottom to make text pop */}
              <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="relative z-10 mt-auto p-3 text-left md:p-4">
                <p className="font-headline-sm text-sm uppercase text-white md:text-headline-sm">{name}</p>
                <p className="mt-1 hidden font-label-md text-label-md text-white/80 md:block">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques — 3 colunas × 5 linhas */}
      <section className="mx-auto max-w-container px-margin-mobile pb-20 md:px-margin-desktop">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Destaques</h2>
          <Button variant="outline" asChild size="sm">
            <Link href="/bolsas">Ver tudo</Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {FEATURED.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>

      {/* Presença nacional */}
      <CitySection />
    </>
  )
}
