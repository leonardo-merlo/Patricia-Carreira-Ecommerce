'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import { revalidatePath } from 'next/cache'

export async function toggleProductStatus(productId: string, isActive: boolean): Promise<void> {
  await requireAdmin()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/estoque')
}

// ─── Variantes (compartilhado entre criar/editar) ─────────────────────────────

export type VariantBomInput = {
  raw_material_id: string
  quantity_needed: number
}

export type VariantInput = {
  tempId: string // chave estável do client, sempre presente
  id?: string // presente se a variante já existe no banco
  color: string | null
  size: string | null
  sku: string
  stock_quantity: number
  images: string[]
  bom: VariantBomInput[] // lista completa desejada — servidor substitui a existente
}

async function saveVariantBom(
  supabase: ReturnType<typeof createServiceClient>,
  variantId: string,
  bom: VariantBomInput[],
): Promise<void> {
  const { error: delError } = await supabase
    .from('bill_of_materials')
    .delete()
    .eq('product_variant_id', variantId)
  if (delError) throw new Error(delError.message)

  if (bom.length === 0) return

  const { error: insError } = await supabase.from('bill_of_materials').insert(
    bom.map((b) => ({
      product_variant_id: variantId,
      raw_material_id: b.raw_material_id,
      quantity_needed: b.quantity_needed,
    })),
  )
  if (insError) throw new Error(insError.message)
}

// ─── Atualizar produto ─────────────────────────────────────────────────────────

export type UpdateProductData = {
  name: string
  description: string | null
  base_price: number
  wholesale_price: number | null
  category: string
  subcategory: string | null
  is_active: boolean
  is_featured: boolean
  weight_grams: number | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  tags: string[]
  ncm: string | null
  cfop: string | null
  variants: VariantInput[]
}

export async function updateProduct(productId: string, data: UpdateProductData): Promise<void> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      description: data.description,
      base_price: data.base_price,
      wholesale_price: data.wholesale_price,
      category: data.category,
      subcategory: data.subcategory,
      is_active: data.is_active,
      is_featured: data.is_featured,
      weight_grams: data.weight_grams,
      length_cm: data.length_cm,
      width_cm: data.width_cm,
      height_cm: data.height_cm,
      tags: data.tags,
      ncm: data.ncm,
      cfop: data.cfop,
    })
    .eq('id', productId)

  if (error) throw new Error(error.message)

  for (const v of data.variants) {
    if (v.id) {
      const { error: varError } = await supabase
        .from('product_variants')
        .update({
          color: v.color,
          size: v.size,
          sku: v.sku,
          stock_quantity: v.stock_quantity,
          images: v.images,
        })
        .eq('id', v.id)
      if (varError) throw new Error(varError.message)
      await saveVariantBom(supabase, v.id, v.bom)
    } else {
      const { data: newVariant, error: insError } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          color: v.color,
          size: v.size,
          sku: v.sku,
          stock_quantity: v.stock_quantity,
          images: v.images,
        })
        .select('id')
        .single()
      if (insError) throw new Error(insError.message)
      await saveVariantBom(supabase, newVariant.id as string, v.bom)
    }
  }

  revalidatePath('/admin/estoque')
}

// ─── Criar produto ──────────────────────────────────────────────────────────

export type CreateProductInput = {
  name: string
  description: string | null
  base_price: number
  wholesale_price: number | null
  category: string
  subcategory: string | null
  is_active: boolean
  is_featured: boolean
  weight_grams: number | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  tags: string[]
  ncm: string | null
  cfop: string | null
  variants: VariantInput[]
}

export async function createProduct(data: CreateProductInput): Promise<string> {
  await requireAdmin()
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
      is_featured: data.is_featured,
      weight_grams: data.weight_grams,
      length_cm: data.length_cm,
      width_cm: data.width_cm,
      height_cm: data.height_cm,
      tags: data.tags ?? [],
      ncm: data.ncm ?? null,
      cfop: data.cfop ?? null,
    })
    .select('id')
    .single()

  if (prodError) throw new Error(prodError.message)

  for (const v of data.variants) {
    const { data: newVariant, error: varError } = await supabase
      .from('product_variants')
      .insert({
        product_id: product.id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        stock_quantity: v.stock_quantity,
        images: v.images,
      })
      .select('id')
      .single()
    if (varError) throw new Error(varError.message)
    await saveVariantBom(supabase, newVariant.id as string, v.bom)
  }

  revalidatePath('/admin/estoque')
  return product.id as string
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function uploadProductImage(formData: FormData): Promise<string> {
  await requireAdmin()
  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('Arquivo inválido')
  if (!file.type.startsWith('image/')) throw new Error('Apenas imagens são permitidas')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Imagem acima de 5MB')

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
  await requireAdmin()
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

// ─── Importação CSV (edição em massa de produtos existentes) ──────────────────
//
// Cada linha do CSV é uma variante (SKU). Campos de produto (nome, categoria,
// preço...) se repetem nas linhas de todas as variantes do mesmo produto — se
// o CSV tiver valores diferentes para o mesmo produto em linhas diferentes, a
// última linha processada é quem vale (mesmo aviso já feito na UI de import).
//
// Import só ATUALIZA SKUs existentes — nunca cria produto/variante novos.
// Fotos, dados fiscais (NCM/CFOP) e BOM ficam de fora: exigem o modal.

const CATEGORIES = new Set(['bolsas', 'roupas', 'acessorios', 'bazar'])
const SUBCATEGORIES = new Set(['vestidos', 'batas'])

export type CsvImportRow = {
  sku: string
  product_name: string | null
  description: string | null
  category: string | null
  subcategory: string | null
  color: string | null
  size: string | null
  stock_quantity: number | null
  base_price: number | null
  wholesale_price: number | null
  is_active: boolean | null
  is_featured: boolean | null
  tags: string[] | null
  weight_grams: number | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
}

export type CsvImportResult =
  | { success: true; updated: number; notFound: string[]; invalid: { sku: string; reason: string }[] }
  | { success: false; error: string }

function validateRow(row: CsvImportRow): string | null {
  if (row.category !== null && !CATEGORIES.has(row.category)) {
    return `categoria inválida "${row.category}"`
  }
  if (row.subcategory !== null && row.subcategory !== '' && !SUBCATEGORIES.has(row.subcategory)) {
    return `subcategoria inválida "${row.subcategory}"`
  }
  return null
}

export async function importProductsCsv(rows: CsvImportRow[]): Promise<CsvImportResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const skus = rows.map((r) => r.sku)
  const { data: variants, error: fetchError } = await supabase
    .from('product_variants')
    .select('id, sku, stock_quantity, product_id')
    .in('sku', skus)

  if (fetchError) return { success: false, error: fetchError.message }

  type VariantRow = { id: string; sku: string; stock_quantity: number; product_id: string }
  const bySku = new Map<string, VariantRow>((variants as VariantRow[]).map((v) => [v.sku, v]))
  const notFound: string[] = []
  const invalid: { sku: string; reason: string }[] = []
  let updated = 0

  for (const row of rows) {
    const variant = bySku.get(row.sku)
    if (!variant) {
      notFound.push(row.sku)
      continue
    }

    const reason = validateRow(row)
    if (reason) {
      invalid.push({ sku: row.sku, reason })
      continue
    }

    const variantUpdate: Record<string, string | number> = {}
    if (row.color !== null) variantUpdate.color = row.color
    if (row.size !== null) variantUpdate.size = row.size
    if (row.stock_quantity !== null) variantUpdate.stock_quantity = row.stock_quantity

    if (Object.keys(variantUpdate).length > 0) {
      const { error: varError } = await supabase
        .from('product_variants')
        .update(variantUpdate)
        .eq('id', variant.id)
      if (varError) return { success: false, error: varError.message }
    }

    if (row.stock_quantity !== null) {
      const before = Number(variant.stock_quantity)
      await supabase.from('stock_adjustments').insert({
        target: 'product_variant',
        target_id: variant.id,
        quantity_before: before,
        quantity_after: row.stock_quantity,
        delta: row.stock_quantity - before,
        reason: 'ajuste_inventario',
        notes: 'Importação CSV',
        created_by: 'henrique',
      })
    }

    const productUpdate: Record<string, string | number | boolean | string[] | null> = {}
    if (row.product_name !== null) productUpdate.name = row.product_name
    if (row.description !== null) productUpdate.description = row.description
    if (row.category !== null) productUpdate.category = row.category
    if (row.subcategory !== null) productUpdate.subcategory = row.subcategory || null
    if (row.base_price !== null) productUpdate.base_price = row.base_price
    if (row.wholesale_price !== null) productUpdate.wholesale_price = row.wholesale_price
    if (row.is_active !== null) productUpdate.is_active = row.is_active
    if (row.is_featured !== null) productUpdate.is_featured = row.is_featured
    if (row.tags !== null) productUpdate.tags = row.tags
    if (row.weight_grams !== null) productUpdate.weight_grams = row.weight_grams
    if (row.length_cm !== null) productUpdate.length_cm = row.length_cm
    if (row.width_cm !== null) productUpdate.width_cm = row.width_cm
    if (row.height_cm !== null) productUpdate.height_cm = row.height_cm

    if (Object.keys(productUpdate).length > 0) {
      const { error: prodError } = await supabase
        .from('products')
        .update(productUpdate)
        .eq('id', variant.product_id)
      if (prodError) return { success: false, error: prodError.message }
    }

    updated++
  }

  revalidatePath('/admin/estoque')
  return { success: true, updated, notFound, invalid }
}
