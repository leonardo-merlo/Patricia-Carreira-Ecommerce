import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductBySlug, getProductsByCategory } from "@/lib/supabase/products"
import { ProductDetail } from "@/components/store/product-detail"

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)
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
): string {
  if (category === "roupas" && subcategory === "vestidos") return "vestidos"
  if (category === "roupas" && subcategory === "batas") return "batas"
  if (category === "bolsas") return "bolsas"
  if (category === "bazar") return "bazar"
  return "acessorios"
}

export default async function ProdutoPage({ params }: PageProps) {
  const product = await getProductBySlug(params.slug)

  if (!product) notFound()

  const categoryKey = getCategoryKey(product.category, product.subcategory)
  const relatedProducts = (await getProductsByCategory(categoryKey))
    .filter((p) => p.id !== product.id)
    .slice(0, 4)

  return (
    <ProductDetail
      product={product}
      relatedProducts={relatedProducts}
    />
  )
}
