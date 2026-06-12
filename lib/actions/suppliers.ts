'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'

export type Supplier = {
  id: string
  name: string
  cnpj: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  rating: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  materials_count: number
}

export type SupplierFormData = {
  name: string
  cnpj: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  rating: number
  notes: string | null
}

export type SupplierResult =
  | { success: true }
  | { success: false; error: string }

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      id,
      name,
      cnpj,
      contact_name,
      phone,
      email,
      city,
      address,
      rating,
      notes,
      is_active,
      created_at,
      updated_at
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[suppliers] getSuppliers error:', error)
    return []
  }

  // Count linked raw materials for each supplier
  const supplierIds = (data ?? []).map((s) => s.id)

  const { data: matCounts } = await supabase
    .from('raw_materials')
    .select('supplier_id')
    .in('supplier_id', supplierIds)

  const countMap: Record<string, number> = {}
  for (const row of matCounts ?? []) {
    if (row.supplier_id) {
      countMap[row.supplier_id] = (countMap[row.supplier_id] ?? 0) + 1
    }
  }

  return (data ?? []).map((s) => ({
    ...s,
    rating: s.rating ?? 3,
    materials_count: countMap[s.id] ?? 0,
  }))
}

export async function getSupplierMaterials(
  supplierId: string,
): Promise<{ id: string; name: string; unit: string }[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('raw_materials')
    .select('id, name, unit')
    .eq('supplier_id', supplierId)
    .order('name', { ascending: true })

  if (error) {
    console.error('[suppliers] getSupplierMaterials error:', error)
    return []
  }

  return data ?? []
}

export async function createSupplier(
  formData: SupplierFormData,
): Promise<SupplierResult> {
  if (!formData.name.trim()) {
    return { success: false, error: 'Nome do fornecedor é obrigatório.' }
  }

  const supabase = createServiceClient()

  const { error } = await supabase.from('suppliers').insert({
    name: formData.name.trim(),
    cnpj: formData.cnpj?.trim() || null,
    contact_name: formData.contact_name?.trim() || null,
    phone: formData.phone?.trim() || null,
    email: formData.email?.trim() || null,
    city: formData.city?.trim() || null,
    address: formData.address?.trim() || null,
    rating: formData.rating,
    notes: formData.notes?.trim() || null,
  })

  if (error) {
    console.error('[suppliers] createSupplier error:', error)
    return { success: false, error: error.message ?? 'Erro ao cadastrar fornecedor.' }
  }

  revalidatePath('/admin/fornecedores')
  return { success: true }
}

export async function updateSupplier(
  id: string,
  formData: SupplierFormData,
): Promise<SupplierResult> {
  if (!formData.name.trim()) {
    return { success: false, error: 'Nome do fornecedor é obrigatório.' }
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('suppliers')
    .update({
      name: formData.name.trim(),
      cnpj: formData.cnpj?.trim() || null,
      contact_name: formData.contact_name?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      city: formData.city?.trim() || null,
      address: formData.address?.trim() || null,
      rating: formData.rating,
      notes: formData.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[suppliers] updateSupplier error:', error)
    return { success: false, error: error.message ?? 'Erro ao salvar fornecedor.' }
  }

  revalidatePath('/admin/fornecedores')
  return { success: true }
}

export async function deleteSupplier(id: string): Promise<SupplierResult> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[suppliers] deleteSupplier error:', error)
    return { success: false, error: 'Erro ao remover fornecedor.' }
  }

  revalidatePath('/admin/fornecedores')
  return { success: true }
}
