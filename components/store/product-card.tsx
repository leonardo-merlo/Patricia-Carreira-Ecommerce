import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils"
import { getProductBadge } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { ProductImage } from "@/components/store/product-image"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
  className?: string
  compact?: boolean
}

export function ProductCard({ product, className, compact = false }: ProductCardProps) {
  const badge = getProductBadge(product)
  const firstImage = product.images[0] ?? null
  const isOutOfStock = badge === "Esgotado"

  return (
    <Link
      href={`/produto/${product.slug}`}
      className={cn("group block", className)}
      aria-label={`Ver ${product.name}`}
    >
      <div className={cn(
        "relative w-full overflow-hidden rounded-lg bg-surface-container-high",
        compact ? "aspect-[4/5]" : "aspect-[3/4]"
      )}>
        {firstImage && (
          <ProductImage
            src={firstImage}
            alt={product.name}
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              isOutOfStock && "opacity-60"
            )}
          />
        )}

        {badge && (
          <div className="absolute left-3 top-3">
            <Badge
              variant={
                badge === "Esgotado"
                  ? "secondary"
                  : badge === "Última Peça"
                  ? "tertiary"
                  : "default"
              }
            >
              {badge}
            </Badge>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1 px-1">
        <p className="line-clamp-2 font-body-md text-body-md text-on-surface transition-colors group-hover:text-primary">
          {product.name}
        </p>
        <p
          className={cn(
            "font-label-md text-label-md",
            isOutOfStock ? "text-on-surface-variant" : "text-on-surface"
          )}
        >
          {isOutOfStock ? "Esgotado" : formatPrice(product.base_price)}
        </p>
      </div>
    </Link>
  )
}
