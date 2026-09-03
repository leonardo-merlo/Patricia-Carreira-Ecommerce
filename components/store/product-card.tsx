"use client" // requires useCart for quick-add and useState for hover tracking

import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils"
import { getProductBadge } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ProductImage } from "@/components/store/product-image"
import { useCart } from "@/lib/cart-context"
import type { Product, ProductVariant } from "@/lib/types"

interface ProductCardProps {
  product: Product
  className?: string
  compact?: boolean
  showLowStockWarning?: boolean
}

function tagVariant(tag: string): "default" | "secondary" | "tertiary" {
  if (tag === "Promoção") return "tertiary"
  if (tag === "Últimas peças") return "tertiary"
  if (tag === "Bazar") return "secondary"
  return "default"
}

export function ProductCard({ product, className, compact = false, showLowStockWarning = false }: ProductCardProps) {
  const { addItem } = useCart()
  const [hovered, setHovered] = useState(false)

  const badge = getProductBadge(product, showLowStockWarning)
  const firstImage = product.variants?.[0]?.images?.[0] ?? null
  const isOutOfStock = badge === "Esgotado"

  // Build a deduplicated list of in-stock sizes, keeping the first variant per size
  const availableSizeVariants: { size: string; variant: ProductVariant & { product: Product } }[] =
    product.variants
      ? Array.from(
          product.variants
            .filter((v) => v.stock_quantity > 0 && v.size)
            .reduce<Map<string, ProductVariant>>((map, v) => {
              if (!map.has(v.size as string)) map.set(v.size as string, v)
              return map
            }, new Map())
            .entries()
        ).map(([size, variant]) => ({ size, variant: { ...variant, product } }))
      : []

  // For single-size products (e.g. "Único") — the one available in-stock variant
  const singleVariant: (ProductVariant & { product: Product }) | null =
    availableSizeVariants.length === 1
      ? (availableSizeVariants[0]?.variant ?? null)
      : availableSizeVariants.length === 0
      ? (() => {
          const v = product.variants?.find((pv) => pv.stock_quantity > 0) ?? null
          return v ? { ...v, product } : null
        })()
      : null

  const showMultiSize = availableSizeVariants.length > 1
  const showSingleAdd = !showMultiSize && singleVariant !== null
  const showQuickAdd = !isOutOfStock && (showMultiSize || showSingleAdd)

  const installmentValue = Math.ceil(product.base_price / 6)

  function handleAddSingle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (singleVariant) addItem(singleVariant)
  }

  function handleAddSize(
    e: React.MouseEvent,
    variant: ProductVariant & { product: Product }
  ) {
    e.preventDefault()
    e.stopPropagation()
    addItem(variant)
  }

  return (
    <Link
      href={`/produto/${product.slug}`}
      className={cn("group block", className)}
      aria-label={`Ver ${product.name}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          // A foto é o argumento de venda, então ela é sempre 3:4. O `compact`
          // hoje muda só o tamanho do texto: a grade de Destaques passou de 5
          // para 4 colunas e o card ficou largo o bastante para a foto alta.
          "relative w-full overflow-hidden rounded-lg bg-surface-container-high",
          "aspect-[3/4]"
        )}
      >
        {firstImage && (
          <ProductImage
            src={firstImage}
            alt={product.name}
            className={cn(
              "object-cover transform-gpu will-change-transform transition-transform duration-500 group-hover:scale-105",
              isOutOfStock && "opacity-60"
            )}
          />
        )}

        {(badge || (product.tags?.length ?? 0) > 0) && (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
            {badge && (
              <Badge
                variant={
                  badge === "Esgotado"
                    ? "secondary"
                    : badge === "Última Peça" || badge === "Últimas peças"
                    ? "tertiary"
                    : "default"
                }
              >
                {badge}
              </Badge>
            )}
            {(product.tags ?? []).map((tag) => (
              <Badge key={tag} variant={tagVariant(tag)}>{tag}</Badge>
            ))}
          </div>
        )}

        {/* Quick-add bar — slides up from bottom of image on hover */}
        {showQuickAdd && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-surface/90 backdrop-blur-sm px-3 py-2",
              "transition-transform duration-300 ease-out",
              hovered ? "translate-y-0" : "translate-y-full"
            )}
          >
            {showMultiSize ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                {availableSizeVariants.map(({ size, variant }) => (
                  <button
                    key={size}
                    type="button"
                    onClick={(e) => handleAddSize(e, variant)}
                    className="rounded border border-outline-variant bg-surface px-2 py-1 font-caption text-caption text-on-surface hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleAddSingle}
                  aria-label={`Adicionar ${product.name} ao carrinho`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1 px-1 text-center">
        <p className={cn(
          "line-clamp-2 font-medium leading-tight text-on-surface transition-colors group-hover:text-primary",
          compact ? "text-[13px] md:text-[17px]" : "text-[17px] md:text-[19px]"
        )}>
          {product.name}
        </p>
        {isOutOfStock ? (
          <p className={cn(
            "text-on-surface-variant",
            compact ? "text-[13px] md:text-[16px]" : "text-[16px] md:text-[18px]"
          )}>Esgotado</p>
        ) : (
          <>
            <p className={cn(
              "font-semibold text-on-surface",
              compact ? "text-[14px] md:text-[20px]" : "text-[19px] md:text-[22px]"
            )}>
              {formatPrice(product.base_price)}
            </p>
            <p className={cn(
              "text-on-surface-variant",
              compact ? "text-[11px] md:text-[13px]" : "text-[13px] md:text-[15px]"
            )}>
              6x de {formatPrice(installmentValue)} sem juros
            </p>
          </>
        )}
      </div>
    </Link>
  )
}
