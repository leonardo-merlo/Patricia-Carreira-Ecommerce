import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductBySlug, getProductsByCategory } from "@/lib/supabase/products"
import { isProductInWishlist } from "@/lib/actions/wishlist"
import { createClient } from "@/lib/supabase/server"
import { ProductDetail } from "@/components/store/product-detail"
import { getStoreSettings } from "@/lib/server/store-settings"

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

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const categoryKey = getCategoryKey(product.category, product.subcategory)
  const [relatedProducts, initialIsFavorited, settings] = await Promise.all([
    getProductsByCategory(categoryKey).then((ps) =>
      ps.filter((p) => p.id !== product.id).slice(0, 4)
    ),
    isProductInWishlist(product.id),
    getStoreSettings().catch(() => null),
  ])

  return (
    <ProductDetail
      product={product}
      relatedProducts={relatedProducts}
      initialIsFavorited={initialIsFavorited}
      isLoggedIn={isLoggedIn}
      showLowStockWarning={settings?.show_low_stock_warning ?? false}
    />
  )
}
