import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductsByCategory } from "@/lib/supabase/products"
import { CategoryPageContent } from "@/components/store/category-page-content"
import { getStoreSettings } from "@/lib/actions/settings"
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

const CATEGORY_META: Record<Categoria, { title: string; description: string }> = {
  bazar: {
    title: "Bazar",
    description:
      "Peças especiais de coleções anteriores com preços únicos. Quantidade limitada — quando acabar, não repõe.",
  },
  bolsas: {
    title: "Bolsas",
    description:
      "Tiracolo, tote bags e clutches confeccionadas à mão com materiais naturais.",
  },
  vestidos: {
    title: "Vestidos",
    description:
      "Vestidos em linho e algodão com bordados manuais. Cada peça é única.",
  },
  batas: {
    title: "Batas",
    description:
      "Batas soltas e confortáveis com bordado artesanal — perfeitas para o verão.",
  },
  acessorios: {
    title: "Acessórios",
    description:
      "Colares, brincos e cintos artesanais que completam qualquer look.",
  },
  vestuario: {
    title: "Vestuário",
    description:
      "Vestidos, batas, macacões, shorts, saias e muito mais — confeccionados à mão com tecidos naturais.",
  },
  lancamentos: {
    title: "Lançamentos",
    description:
      "As novidades mais recentes da Patrícia Carreira. Peças exclusivas em quantidade limitada.",
  },
  infantil: {
    title: "Infantil",
    description:
      "Peças artesanais especialmente criadas para os pequenos.",
  },
  almofadas: {
    title: "Almofadas",
    description:
      "Almofadas artesanais com bordados manuais. Beleza e conforto para o seu lar.",
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
  } else if (categoria === "lancamentos") {
    products = await getProductsByCategory("lancamentos")
  } else if (categoria === "infantil" || categoria === "almofadas") {
    products = []
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
