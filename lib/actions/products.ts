'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function toggleProductStatus(productId: string, isActive: boolean): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/estoque')
}

export type UpdateProductData = {
  name: string
  description: string | null
  base_price: number
  wholesale_price: number | null
  category: string
  subcategory: string | null
  is_active: boolean
  images: string[]
  tags: string[]
  ncm: string | null
  cfop: string | null
}

export async function updateProduct(productId: string, data: UpdateProductData): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('products')
    .update({ ...data })
    .eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/estoque')
}

export type NewVariantInput = {
  color: string | null
  size: string | null
  sku: string
  stock_quantity: number
}

export type CreateProductInput = {
  name: string
  description: string | null
  base_price: number
  wholesale_price: number | null
  category: string
  subcategory: string | null
  is_active: boolean
  images: string[]
  tags: string[]
  ncm: string | null
  cfop: string | null
  variants: NewVariantInput[]
}

export async function createProduct(data: CreateProductInput): Promise<string> {
  const supabase = createServiceClient()

  const slug =
    data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36)

  const { data: product, error: prodError } = await supabase
    .from('products')
    .insert({
      name: data.name,
      slug,
      description: data.description,
      base_price: data.base_price,
      wholesale_price: data.wholesale_price,
      category: data.category,
      subcategory: data.subcategory ?? null,
      is_active: data.is_active,
      images: data.images,
      tags: data.tags ?? [],
      ncm: data.ncm ?? null,
      cfop: data.cfop ?? null,
    })
    .select('id')
    .single()

  if (prodError) throw new Error(prodError.message)

  if (data.variants.length > 0) {
    const { error: varError } = await supabase.from('product_variants').insert(
      data.variants.map((v) => ({
        product_id: product.id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        stock_quantity: v.stock_quantity,
      })),
    )
    if (varError) throw new Error(varError.message)
  }

  revalidatePath('/admin/estoque')
  return product.id as string
}

export async function uploadProductImage(formData: FormData): Promise<string> {
  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('Arquivo inválido')

  const supabase = createServiceClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

export async function adjustVariantStock(
  variantId: string,
  newQuantity: number,
): Promise<void> {
  const supabase = createServiceClient()

  const { data: variant, error: fetchError } = await supabase
    .from('product_variants')
    .select('stock_quantity')
    .eq('id', variantId)
    .single()

  if (fetchError || !variant) throw new Error('Variante não encontrada')

  const before = Number(variant.stock_quantity)

  const { error } = await supabase
    .from('product_variants')
    .update({ stock_quantity: newQuantity })
    .eq('id', variantId)

  if (error) throw new Error(error.message)

  await supabase.from('stock_adjustments').insert({
    target: 'product_variant',
    target_id: variantId,
    quantity_before: before,
    quantity_after: newQuantity,
    delta: newQuantity - before,
    reason: 'ajuste_inventario',
    notes: null,
    created_by: 'henrique',
  })

  revalidatePath('/admin/estoque')
}
