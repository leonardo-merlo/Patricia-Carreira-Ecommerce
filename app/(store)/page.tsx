import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductGrid } from "@/components/store/product-grid"
import { HeroCarousel } from "@/components/store/hero-carousel"
import { CitiesMap } from "@/components/store/cities-map"
import { MOCK_PRODUCTS } from "@/lib/mock-data"

const CATEGORIES = [
  {
    name: "Bazar",
    href: "/bazar",
    description: "Peças especiais",
    image: "/images/products/imagens/bolsa_nirvana_marinho_0.jpeg",
    overlay: "bg-orange-900/62",
  },
  {
    name: "Bolsas",
    href: "/bolsas",
    description: "Tiracolo, tote, clutch",
    image: "/images/products/imagens/bolsa_flora_vinho_0.jpeg",
    overlay: "bg-red-900/62",
  },
  {
    name: "Vestidos",
    href: "/vestidos",
    description: "Linho, algodão, bordados",
    image: "/images/products/imagens/produto_pagina_57_vestido_fiji_0.jpeg",
    overlay: "bg-blue-900/62",
  },
  {
    name: "Batas",
    href: "/batas",
    description: "Soltas, confortáveis, únicas",
    image: "/images/products/imagens/produto_pagina_79_bata_asteca_0.jpeg",
    overlay: "bg-amber-900/62",
  },
]

const FEATURED = MOCK_PRODUCTS.filter((p) => p.is_active && p.category !== "bazar").slice(0, 4)

export default function HomePage() {
  return (
    <>
      {/* Hero carousel */}
      <HeroCarousel />

      {/* Categorias */}
      <section className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
        <h2 className="mb-8 font-headline-sm text-headline-sm text-on-surface">Categorias</h2>

        <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
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
              <div className="relative z-10 mt-auto p-4 text-left">
                <p className="font-headline-sm text-headline-sm text-white">{name}</p>
                <p className="mt-1 font-caption text-caption text-white/80">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-container px-margin-mobile pb-20 md:px-margin-desktop">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Destaques</h2>
          <Button variant="outline" asChild size="sm">
            <Link href="/bolsas">Ver tudo</Link>
          </Button>
        </div>
        <ProductGrid products={FEATURED} />
      </section>

      {/* Presença nacional */}
      <section className="bg-primary">
        <div className="mx-auto max-w-container px-margin-mobile py-14 md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-display-lg text-display-lg-mobile text-on-primary md:text-display-lg">
                23
              </p>
              <p className="mt-1 font-headline-sm text-headline-sm text-on-primary">
                cidades alcançadas
              </p>
              <p className="mt-4 max-w-sm font-body-lg text-body-lg text-on-primary/80">
                Peças artesanais confeccionadas em Minas Gerais e presentes em todo o Brasil.
                Cada compra leva um pedaço do artesanato mineiro para a sua casa.
              </p>
            </div>

            <CitiesMap />
          </div>
        </div>
      </section>
    </>
  )
}
