import { ProductCard } from "@/components/store/product-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Product } from "@/lib/types"

interface ProductGridProps {
  products: Product[]
  loading?: boolean
}

export function ProductGrid({ products, loading = false }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid content-start grid-cols-2 gap-gutter md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[3/4] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="font-headline-sm text-headline-sm text-on-surface-variant">
          Nenhum produto encontrado
        </p>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Tente ajustar os filtros ou volte em breve.
        </p>
      </div>
    )
  }

  return (
    <div className="grid content-start grid-cols-2 gap-gutter md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
