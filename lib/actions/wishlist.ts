'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Product } from '@/lib/types'

export async function toggleWishlist(
  productId: string,
): Promise<{ ok: true; isFavorited: boolean } | { ok: false; error: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('[wishlist] user not authenticated')
    return { ok: false, error: 'login_required' }
  }

  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('wishlists').delete().eq('id', existing.id)
    if (error) {
      console.error('[wishlist] delete error:', error)
      return { ok: false, error: 'Erro ao remover favorito' }
    }
    revalidatePath('/conta/favoritos')
    return { ok: true, isFavorited: false }
  }

  const { error } = await supabase
    .from('wishlists')
    .insert({ user_id: user.id, product_id: productId })
  if (error) {
    console.error('[wishlist] insert error:', error)
    return { ok: false, error: 'Erro ao salvar favorito' }
  }
  revalidatePath('/conta/favoritos')
  return { ok: true, isFavorited: true }
}

export async function isProductInWishlist(productId: string): Promise<boolean> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  return !!data
}

export async function getWishlistProducts(): Promise<Product[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wishlists')
    .select(
      `
      created_at,
      products (
        id, name, slug, description, category, subcategory,
        base_price, wholesale_price, is_active, images,
        weight_grams, length_cm, width_cm, height_cm,
        measurements, created_at,
        variants:product_variants (
          id, product_id, sku, size, color, stock_quantity, created_at
        )
      )
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .map((row) => row.products as unknown as Product)
    .filter((p): p is Product => p !== null)
}
