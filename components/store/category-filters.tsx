"use client" // filter state mutations require React state + event handlers

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FilterState } from "@/lib/types"

interface CategoryFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  availableSizes?: string[]
  availableColors?: string[]
  availableSubcategories?: string[]
  className?: string
}

const SORT_OPTIONS: { label: string; value: FilterState["sort"] }[] = [
  { label: "Relevância",   value: "relevance" },
  { label: "Menor preço",  value: "price_asc" },
  { label: "Maior preço",  value: "price_desc" },
  { label: "Mais recente", value: "newest" },
]

export function CategoryFilters({
  filters,
  onChange,
  availableSizes = [],
  availableColors = [],
  availableSubcategories = [],
  className,
}: CategoryFiltersProps) {
  const hasActiveFilters =
    filters.subcategories.length > 0 ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.price_min !== null ||
    filters.price_max !== null ||
    filters.sort !== "relevance"

  function toggleArray(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  function clearFilters() {
    onChange({
      subcategories: [],
      colors: [],
      sizes: [],
      price_min: null,
      price_max: null,
      sort: "relevance",
    })
  }

  return (
    <aside className={cn("flex flex-col gap-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-label-md text-label-md text-on-surface">Filtros</p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar
          </Button>
        )}
      </div>

      <Separator />

      {/* Ordenação */}
      <div className="flex flex-col gap-3">
        <p className="font-label-md text-label-md text-on-surface-variant">Ordenar</p>
        <Select
          value={filters.sort}
          onValueChange={(value) =>
            onChange({ ...filters, sort: value as FilterState["sort"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategorias */}
      {availableSubcategories.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="font-label-md text-label-md text-on-surface-variant">Categoria</p>
            {availableSubcategories.map((sub) => (
              <label key={sub} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.subcategories.includes(sub)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      subcategories: toggleArray(filters.subcategories, sub),
                    })
                  }
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="font-body-md text-body-md capitalize text-on-surface">
                  {sub}
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* Tamanhos */}
      {availableSizes.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="font-label-md text-label-md text-on-surface-variant">Tamanho</p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() =>
                    onChange({ ...filters, sizes: toggleArray(filters.sizes, size) })
                  }
                  className={cn(
                    "h-9 min-w-[36px] rounded border px-2 font-label-md text-label-md transition-colors",
                    filters.sizes.includes(size)
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant text-on-surface hover:border-primary hover:text-primary"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Cores */}
      {availableColors.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="font-label-md text-label-md text-on-surface-variant">Cor</p>
            {availableColors.map((color) => (
              <label key={color} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.colors.includes(color)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      colors: toggleArray(filters.colors, color),
                    })
                  }
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="font-body-md text-body-md text-on-surface">{color}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* Preço */}
      <Separator />
      <div className="flex flex-col gap-3">
        <p className="font-label-md text-label-md text-on-surface-variant">Preço</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Mín"
            value={filters.price_min ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                price_min: e.target.value ? Number(e.target.value) : null,
              })
            }
            min={0}
            className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest px-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          <span className="font-body-md text-on-surface-variant">–</span>
          <input
            type="number"
            placeholder="Máx"
            value={filters.price_max ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                price_max: e.target.value ? Number(e.target.value) : null,
              })
            }
            min={0}
            className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest px-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </div>
      </div>
    </aside>
  )
}
