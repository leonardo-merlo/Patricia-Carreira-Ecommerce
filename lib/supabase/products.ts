import { createClient } from '@/lib/supabase/server'
import type { Product, ProductWithVariants } from '@/lib/types'

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getProductBySlug]', error)
    return null
  }
  return data as ProductWithVariants | null
}

export async function getProductsByCategory(
  category: string,
  onlyActive = true,
): Promise<Product[]> {
  const supabase = createClient()

  let query = supabase
    .from('products')
    .select('*, variants:product_variants(*)')

  if (onlyActive) query = query.eq('is_active', true)

  if (category === 'vestuario') {
    query = query.eq('category', 'roupas')
  } else if (category === 'lancamentos') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString()
    query = query.neq('category', 'bazar').gte('created_at', thirtyDaysAgo)
  } else if (category === 'vestidos') {
    query = query.eq('category', 'roupas').eq('subcategory', 'vestidos')
  } else if (category === 'batas') {
    query = query.eq('category', 'roupas').eq('subcategory', 'batas')
  } else if (['bolsas', 'acessorios', 'bazar'].includes(category)) {
    query = query.eq('category', category)
  } else {
    return []
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[getProductsByCategory]', error)
    return []
  }

  const results = (data ?? []) as Product[]

  // Lancamentos fallback: if no recent products, return newest 8 non-bazar
  if (category === 'lancamentos' && results.length === 0) {
    const { data: fallback } = await supabase
      .from('products')
      .select('*, variants:product_variants(*)')
      .eq('is_active', true)
      .neq('category', 'bazar')
      .order('created_at', { ascending: false })
      .limit(8)
    return (fallback ?? []) as Product[]
  }

  return results
}

export async function getFeaturedProducts(slugs: string[]): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .in('slug', slugs)
    .eq('is_active', true)

  if (error) {
    console.error('[getFeaturedProducts]', error)
    return []
  }

  const slugOrder = new Map(slugs.map((s, i) => [s, i]))
  return ((data ?? []) as Product[]).sort(
    (a, b) => (slugOrder.get(a.slug) ?? 99) - (slugOrder.get(b.slug) ?? 99),
  )
}

