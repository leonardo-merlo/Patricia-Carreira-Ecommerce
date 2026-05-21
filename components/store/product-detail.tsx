"use client" // image gallery selection + variant selection + add to cart state

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils"
import { getProductBadge } from "@/lib/mock-data"
import { useCart } from "@/lib/cart-context"
import type { ProductWithVariants, ProductVariant } from "@/lib/types"

interface ProductDetailProps {
  product: ProductWithVariants
}

function getCategoryLink(
  category: string,
  subcategory: string | null
): { label: string; href: string } {
  if (category === "roupas" && subcategory === "vestidos")
    return { label: "Vestidos", href: "/vestidos" }
  if (category === "roupas" && subcategory === "batas")
    return { label: "Batas", href: "/batas" }
  if (category === "bolsas") return { label: "Bolsas", href: "/bolsas" }
  if (category === "acessorios") return { label: "Acessórios", href: "/acessorios" }
  return { label: "Loja", href: "/" }
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length === 1 ? product.variants[0] : null
  )
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  const badge = getProductBadge(product)
  const categoryLink = getCategoryLink(product.category, product.subcategory)

  const validImages = product.images.filter((_, i) => !imageErrors[i])
  const currentImage = product.images[activeImageIndex] ?? null

  const sizes = Array.from(
    new Set(
      product.variants
        .map((v) => v.size)
        .filter((s): s is string => s !== null && s !== "Único")
    )
  )
  const hasSizeSelector = sizes.length > 1

  const isOutOfStock =
    selectedVariant !== null && selectedVariant.stock_quantity === 0
  const isLowStock =
    selectedVariant !== null &&
    selectedVariant.stock_quantity > 0 &&
    selectedVariant.stock_quantity <= 2

  function handleAddToCart() {
    if (!selectedVariant || isOutOfStock) return
    const { variants: _, ...productData } = product
    addItem({ ...selectedVariant, product: productData }, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  function handleImageError(index: number) {
    setImageErrors((prev) => ({ ...prev, [index]: true }))
  }

  const canAddToCart =
    selectedVariant !== null && !isOutOfStock && !added

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-8 md:px-margin-desktop md:py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 font-caption text-caption text-on-surface-variant">
        <Link href="/" className="hover:text-on-surface transition-colors">
          Início
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={categoryLink.href} className="hover:text-on-surface transition-colors">
          {categoryLink.label}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-on-surface">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-14">
        {/* Galeria */}
        <div className="flex flex-col gap-3">
          {/* Imagem principal */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-high">
            {currentImage && !imageErrors[activeImageIndex] && (
              <Image
                src={currentImage}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                onError={() => handleImageError(activeImageIndex)}
              />
            )}
            {badge && (
              <div className="absolute left-4 top-4">
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

          {/* Miniaturas */}
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={cn(
                    "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container-high transition-all",
                    activeImageIndex === i
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-60 hover:opacity-100"
                  )}
                  aria-label={`Ver imagem ${i + 1}`}
                >
                  {!imageErrors[i] && (
                    <Image
                      src={img}
                      alt={`${product.name} — imagem ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                      onError={() => handleImageError(i)}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              {product.name}
            </h1>
            <p className="mt-2 font-display-lg text-headline-sm text-primary">
              {formatPrice(product.base_price)}
            </p>
          </div>

          {/* Seletor de tamanho */}
          {hasSizeSelector && (
            <div>
              <p className="mb-3 font-label-md text-label-md text-on-surface-variant">
                Tamanho
                {selectedVariant?.size && (
                  <span className="ml-2 text-on-surface">— {selectedVariant.size}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const variant = product.variants.find((v) => v.size === size)
                  const outOfStock = variant?.stock_quantity === 0
                  const isSelected = selectedVariant?.size === size
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        if (!outOfStock && variant) {
                          setSelectedVariant(variant)
                          setAdded(false)
                        }
                      }}
                      disabled={outOfStock}
                      className={cn(
                        "h-10 min-w-[40px] rounded border px-3 font-label-md text-label-md transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-on-primary"
                          : outOfStock
                          ? "border-outline-variant text-on-surface-variant opacity-40 cursor-not-allowed"
                          : "border-outline-variant text-on-surface hover:border-primary hover:text-primary"
                      )}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Estoque */}
          {selectedVariant && (
            <div className="flex items-center gap-2">
              {isOutOfStock ? (
                <Badge variant="secondary">Esgotado</Badge>
              ) : isLowStock ? (
                <p className="font-caption text-caption text-tertiary">
                  Apenas {selectedVariant.stock_quantity} em estoque
                </p>
              ) : (
                <p className="font-caption text-caption text-on-surface-variant">
                  Em estoque
                </p>
              )}
            </div>
          )}

          {/* Botão */}
          <Button
            id="btn-adicionar-carrinho"
            size="lg"
            className="w-full"
            disabled={!canAddToCart}
            onClick={handleAddToCart}
          >
            {added ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Adicionado ao carrinho
              </span>
            ) : hasSizeSelector && !selectedVariant ? (
              "Selecione um tamanho"
            ) : isOutOfStock ? (
              "Esgotado"
            ) : (
              "Adicionar ao carrinho"
            )}
          </Button>

          <Separator />

          {/* Descrição */}
          {product.description && (
            <div>
              <p className="mb-2 font-label-md text-label-md text-on-surface-variant">
                Descrição
              </p>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Tabela de medidas */}
          {product.measurements && (
            <>
              <Separator />
              <div>
                <p className="mb-3 font-label-md text-label-md text-on-surface-variant">
                  Guia de Medidas
                </p>
                <div className="overflow-hidden rounded-lg border border-outline-variant">
                  <table className="w-full font-body-md text-body-md">
                    <thead>
                      <tr className="bg-surface-container-low">
                        <th className="px-4 py-2 text-left font-label-md text-label-md text-on-surface-variant">
                          Tamanho
                        </th>
                        <th className="px-4 py-2 text-left font-label-md text-label-md text-on-surface-variant">
                          Medidas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(product.measurements).map(([size, info]) => (
                        <tr
                          key={size}
                          className="border-t border-outline-variant even:bg-surface-container-lowest"
                        >
                          <td className="px-4 py-2 font-label-md text-on-surface">{size}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{info}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* SKU */}
          {selectedVariant && (
            <p className="font-caption text-caption text-on-surface-variant">
              Ref.: {selectedVariant.sku}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
