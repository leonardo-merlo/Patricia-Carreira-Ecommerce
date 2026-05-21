import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductBySlug, MOCK_PRODUCTS } from "@/lib/mock-data"
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

export default function ProdutoPage({ params }: PageProps) {
  const product = getProductBySlug(params.slug)

  if (!product) notFound()

  return <ProductDetail product={product as ProductWithVariants} />
}
