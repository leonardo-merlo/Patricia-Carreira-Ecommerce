import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductsByCategory } from "@/lib/mock-data"
import { CategoryPageContent } from "@/components/store/category-page-content"

type Categoria = "bazar" | "bolsas" | "vestidos" | "batas" | "acessorios"

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
}

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

export default function CategoriaPage({ params }: PageProps) {
  const categoria = params.categoria as Categoria

  if (!VALID_CATEGORIAS.includes(categoria)) {
    notFound()
  }

  const meta = CATEGORY_META[categoria]
  const products = getProductsByCategory(categoria)

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-10 md:px-margin-desktop">
      <CategoryPageContent
        products={products}
        title={meta.title}
      />
    </div>
  )
}
