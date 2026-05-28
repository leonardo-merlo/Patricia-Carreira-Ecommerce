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

  const availableSizes = product.variants
    ? Array.from(new Set(
        product.variants
          .filter((v) => v.stock_quantity > 0 && v.size)
          .map((v) => v.size as string)
      ))
    : []

  const installmentValue = Math.ceil(product.base_price / 6)

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
              "object-cover transform-gpu transition-transform duration-500 group-hover:scale-105",
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

      <div className="mt-3 space-y-1 px-1 text-center">
        <p className="line-clamp-2 font-body-md text-body-md text-on-surface transition-colors group-hover:text-primary">
          {product.name}
        </p>
        {isOutOfStock ? (
          <p className="font-label-md text-label-md text-on-surface-variant">Esgotado</p>
        ) : (
          <>
            <p className="font-label-md text-label-md text-on-surface">
              {formatPrice(product.base_price)}
            </p>
            <p className="font-caption text-caption text-on-surface-variant">
              6x de {formatPrice(installmentValue)} sem juros
            </p>
          </>
        )}
        {availableSizes.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 pt-0.5">
            {availableSizes.map((size) => (
              <span
                key={size}
                className="rounded border border-outline-variant px-1.5 py-0.5 font-caption text-caption text-on-surface-variant"
              >
                {size}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
