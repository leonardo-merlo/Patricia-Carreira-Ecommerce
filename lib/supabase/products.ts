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

export async function getFeaturedProducts(limit = 15): Promise<Product[]> {
  const supabase = createClient()

  const { data: featured, error: featuredError } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (featuredError) {
    console.error('[getFeaturedProducts]', featuredError)
    return []
  }

  const results = (featured ?? []) as Product[]
  if (results.length >= limit) return results

  // Fallback: completa a grade com os produtos ativos mais recentes,
  // evitando uma seção de Destaques vazia ou curta demais.
  const excludeIds = results.map((p) => p.id)
  let fallbackQuery = supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit - results.length)

  if (excludeIds.length > 0) {
    fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: fallback, error: fallbackError } = await fallbackQuery

  if (fallbackError) {
    console.error('[getFeaturedProducts fallback]', fallbackError)
    return results
  }

  return [...results, ...((fallback ?? []) as Product[])]
}

