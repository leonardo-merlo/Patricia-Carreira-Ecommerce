import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductsByCategory, getFeaturedProducts } from "@/lib/supabase/products"
import { CategoryPageContent } from "@/components/store/category-page-content"
import { getStoreSettings } from "@/lib/server/store-settings"
import type { Product } from "@/lib/types"

type Categoria =
  | "bazar"
  | "bolsas"
  | "vestidos"
  | "batas"
  | "acessorios"
  | "vestuario"
  | "lancamentos"
  | "infantil"
  | "almofadas"
  | "destaques"

const CATEGORY_META: Record<Categoria, { title: string; description: string }> = {
  bazar: {
    title: "Bazar",
    description:
      "Peças especiais de coleções anteriores com preços únicos. Quantidade limitada. Quando acaba, não repõe.",
  },
  bolsas: {
    title: "Bolsas",
    description:
      "Tiracolo, tote bags e clutches confeccionadas à mão com materiais naturais.",
  },
  vestidos: {
    title: "Vestidos",
    description:
      "Vestidos em linho e algodão, com bordado autoral aplicado à mão.",
  },
  batas: {
    title: "Batas",
    description:
      "Batas soltas e confortáveis com bordado artesanal. Boas para o calor.",
  },
  acessorios: {
    title: "Acessórios",
    description:
      "Colares, brincos e cintos feitos à mão, com o mesmo desenho das bolsas.",
  },
  vestuario: {
    title: "Vestuário",
    description:
      "Vestidos, batas, macacões, shorts, saias e camisas, confeccionados à mão com tecidos naturais.",
  },
  lancamentos: {
    title: "Lançamentos",
    description:
      "As peças que chegaram por último na loja. Quantidade limitada.",
  },
  infantil: {
    title: "Infantil",
    description:
      "Batas e vestidos infantis em algodão, com o mesmo bordado das peças adultas.",
  },
  almofadas: {
    title: "Almofadas",
    description:
      "Almofadas com bordado autoral, feitas à mão uma a uma.",
  },
  destaques: {
    title: "Destaques",
    description:
      "As peças escolhidas pela loja para a vitrine da home.",
  },
}

const VESTUARIO_SUBCATEGORIES = [
  "vestidos",
  "batas",
  "macacões",
  "shorts",
  "saias",
  "camisas e tops",
]

const VALID_CATEGORIAS = Object.keys(CATEGORY_META) as Categoria[]

interface PageProps {
  params: { categoria: string }
}

export function generateStaticParams() {
  return VALID_CATEGORIAS.map((categoria) => ({ categoria }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const meta = CATEGORY_META[params.categoria as Categoria]
  if (!meta) return {}
  return {
    title: `${meta.title} | Patrícia Carreira`,
    description: meta.description,
  }
}

export default async function CategoriaPage({ params }: PageProps) {
  const categoria = params.categoria as Categoria

  if (!VALID_CATEGORIAS.includes(categoria)) {
    notFound()
  }

  const meta = CATEGORY_META[categoria]

  let products: Product[]
  let subcategories: string[] | undefined

  if (categoria === "vestuario") {
    products = await getProductsByCategory("vestuario")
    subcategories = VESTUARIO_SUBCATEGORIES
  } else if (categoria === "destaques") {
    // A MESMA função da home, de propósito. Ela tem um fallback: sem nenhum
    // produto marcado como destaque, completa com os mais recentes para a
    // vitrine não ficar vazia. Se esta página consultasse is_featured direto,
    // a home apareceria cheia e /destaques vazia no mesmo instante, que foi
    // exatamente o que aconteceu quando as duas liam fontes diferentes.
    products = await getFeaturedProducts(12)
  } else if (categoria === "lancamentos") {
    products = await getProductsByCategory("lancamentos")
  } else {
    products = await getProductsByCategory(categoria)
  }

  const settings = await getStoreSettings().catch(() => null)

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-10 md:px-margin-desktop">
      <CategoryPageContent
        products={products}
        title={meta.title}
        description={meta.description}
        availableSubcategories={subcategories}
        showLowStockWarning={settings?.show_low_stock_warning ?? false}
      />
    </div>
  )
}
