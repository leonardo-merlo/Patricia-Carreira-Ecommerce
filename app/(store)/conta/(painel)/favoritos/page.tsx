import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getWishlistProducts } from "@/lib/actions/wishlist"
import { ProductCard } from "@/components/store/product-card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Favoritos | Patrícia Carreira",
  description: "Suas peças favoritas salvas em um só lugar.",
}

export default async function FavoritosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/conta/entrar?redirect=/conta/favoritos")

  const products = await getWishlistProducts()

  return (
    <section>
      {/* Cabeçalho */}
      <header className="mb-8">
        <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Minha conta
        </p>
        <h1 className="mt-2 font-headline-md text-headline-md text-on-surface">Favoritos</h1>
        {products.length > 0 && (
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            {products.length === 1 ? "1 peça salva" : `${products.length} peças salvas`}
          </p>
        )}
      </header>

      {products.length === 0 ? (
        <div className="max-w-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed">
            <Heart className="h-9 w-9 text-primary" />
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Nenhum favorito ainda
          </h2>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
            Clique no coração em qualquer produto para salvá-lo aqui.
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
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Separator className="my-10" />

          <Button asChild variant="outline">
            <Link href="/">Continuar explorando</Link>
          </Button>
        </>
      )}
    </section>
  )
}
