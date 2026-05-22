import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductBySlug, getProductsByCategory, MOCK_PRODUCTS } from "@/lib/mock-data"
import { ProductDetail } from "@/components/store/product-detail"
import type { ProductWithVariants } from "@/lib/types"

interface PageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return MOCK_PRODUCTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const product = getProductBySlug(params.slug)
  if (!product) return {}
  return {
    title: `${product.name} | Patrícia Carreira`,
    description: product.description ?? undefined,
    openGraph: {
      images: product.images[0] ? [product.images[0]] : [],
    },
  }
}

function getCategoryKey(
  category: string,
  subcategory: string | null
): "bolsas" | "vestidos" | "batas" | "acessorios" | "bazar" {
  if (category === "roupas" && subcategory === "vestidos") return "vestidos"
  if (category === "roupas" && subcategory === "batas") return "batas"
  if (category === "bolsas") return "bolsas"
  if (category === "bazar") return "bazar"
  return "acessorios"
}

export default function ProdutoPage({ params }: PageProps) {
  const product = getProductBySlug(params.slug)

  if (!product) notFound()

  const categoryKey = getCategoryKey(product.category, product.subcategory)
  const relatedProducts = getProductsByCategory(categoryKey)
    .filter((p) => p.id !== product.id)
    .slice(0, 4)

  return (
    <ProductDetail
      product={product as ProductWithVariants}
      relatedProducts={relatedProducts}
    />
  )
}
