"use client" // filter state + mobile sheet require React state

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { CategoryFilters } from "@/components/store/category-filters"
import { ProductGrid } from "@/components/store/product-grid"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { FilterState, Product } from "@/lib/types"

interface CategoryPageContentProps {
  products: Product[]
  title: string
  description?: string
  availableSubcategories?: string[]
}

const DEFAULT_FILTERS: FilterState = {
  subcategories: [],
  colors: [],
  sizes: [],
  price_min: null,
  price_max: null,
  sort: "relevance",
}

function applyFilters(products: Product[], filters: FilterState): Product[] {
  let result = [...products]

  if (filters.sizes.length > 0) {
    result = result.filter((p) =>
      p.variants?.some((v) => v.size !== null && filters.sizes.includes(v.size as string))
    )
  }

  if (filters.colors.length > 0) {
    result = result.filter((p) =>
      p.variants?.some((v) => v.color !== null && filters.colors.includes(v.color as string))
    )
  }

  if (filters.subcategories.length > 0) {
    result = result.filter(
      (p) => p.subcategory !== null && filters.subcategories.includes(p.subcategory)
    )
  }

  if (filters.price_min !== null) {
    result = result.filter((p) => p.base_price >= (filters.price_min as number))
  }

  if (filters.price_max !== null) {
    result = result.filter((p) => p.base_price <= (filters.price_max as number))
  }

  switch (filters.sort) {
    case "price_asc":
      result.sort((a, b) => a.base_price - b.base_price)
      break
    case "price_desc":
      result.sort((a, b) => b.base_price - a.base_price)
      break
    case "newest":
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      break
  }

  return result
}

export function CategoryPageContent({
  products,
  title,
  description,
  availableSubcategories = [],
}: CategoryPageContentProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  const availableSizes = Array.from(
    new Set(
      products.flatMap((p) =>
        (p.variants ?? []).map((v) => v.size).filter((s): s is string => s !== null)
      )
    )
  )

  const availableColors = Array.from(
    new Set(
      products.flatMap((p) =>
        (p.variants ?? []).map((v) => v.color).filter((c): c is string => c !== null)
      )
    )
  )

  const filtered = applyFilters(products, filters)

  const filterPanel = (
    <CategoryFilters
      filters={filters}
      onChange={setFilters}
      availableSizes={availableSizes}
      availableColors={availableColors}
      availableSubcategories={availableSubcategories}
    />
  )

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="font-display-lg text-display-lg-mobile text-primary md:text-display-lg">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-xl font-body-md text-body-md text-on-surface-variant">
              {description}
            </p>
          )}
        </div>

        {/* Mobile filter button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            {filterPanel}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: sidebar + grid */}
      <div className="hidden gap-10 md:grid md:grid-cols-[240px_1fr]">
        {filterPanel}
        <ProductGrid products={filtered} />
      </div>

      {/* Mobile: grid only */}
      <div className="md:hidden">
        <ProductGrid products={filtered} />
      </div>
    </>
  )
}
