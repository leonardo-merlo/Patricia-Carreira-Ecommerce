import type { Metadata } from "next"
import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Favoritos | Patrícia Carreira",
  description: "Suas peças favoritas salvas em um só lugar.",
}

export default function FavoritosPage() {
  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Lista de desejos
        </p>
        <h1 className="mt-3 font-display-lg text-display-lg-mobile text-on-surface md:text-display-lg">
          Suas{" "}
          <span className="italic text-primary">favoritas</span>
        </h1>
        <p className="mt-5 font-body-lg text-body-lg text-on-surface-variant">
          Salve as peças que você ama para não perder quando elas esgotarem.
        </p>
      </div>

      <Separator className="my-12" />

      {/* Empty state — auth não implementada ainda */}
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed">
          <Heart className="h-9 w-9 text-primary" />
        </div>

        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Nenhum favorito ainda
        </h2>
        <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
          Para salvar suas peças favoritas, você precisará ter uma conta.
          O sistema de login estará disponível em breve.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="lg" className="w-full" id="btn-explorar-favoritos">
            <Link href="/bolsas">Ver bolsas</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/vestidos">Ver vestidos</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href="/">Ir para a loja</Link>
          </Button>
        </div>
      </div>

      <Separator className="my-12" />

      {/* Sugestão de navegação */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Explore a coleção
        </h2>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Cada peça é feita em quantidade limitada. Clique no coração
          em qualquer produto para adicioná-lo aos seus favoritos.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/bazar">Bazar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/bolsas">Bolsas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/vestidos">Vestidos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/batas">Batas</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
