'use server'

import { createServiceClient } from '@/lib/supabase/service'
import {
  addToCart,
  checkoutCart,
  generateLabel,
  getTrackingCode,
  printLabel,
  type MEShippingItem,
} from '@/lib/integrations/melhor-envio'

type MEAddressField = {
  name: string; phone: string; email: string; document: string
  address: string; number: string; complement: string; district: string
  city: string; state_abbr: string; postal_code: string; country_id: 'BR'
}

function buildStoreAddress(): MEAddressField {
  return {
    name: process.env.STORE_NOME ?? 'Patricia Carreira',
    phone: (process.env.STORE_TELEFONE ?? '').replace(/\D/g, ''),
    email: process.env.STORE_EMAIL ?? '',
    document: (process.env.STORE_DOCUMENTO ?? '').replace(/\D/g, ''),
    address: process.env.STORE_LOGRADOURO ?? '',
    number: process.env.STORE_NUMERO ?? '',
    complement: process.env.STORE_COMPLEMENTO ?? '',
    district: process.env.STORE_BAIRRO ?? '',
    city: process.env.STORE_CIDADE ?? '',
    state_abbr: process.env.STORE_ESTADO ?? '',
    postal_code: (process.env.STORE_CEP_ORIGEM ?? '').replace(/\D/g, ''),
    country_id: 'BR',
  }
}

async function fetchOrderForLabel(orderId: string) {
  const supabase = createServiceClient()

  const { data: rawOrder } = await supabase
    .from('orders')
    .select(`
      id, total_amount, melhor_envio_service_id,
      customer:customers(name, email, phone, cpf_cnpj, address),
      items:order_items(quantity, product_variant_id)
    `)
    .eq('id', orderId)
    .maybeSingle()

  return rawOrder
}

async function buildShippingItems(
  orderItems: Array<{ quantity: number; product_variant_id: string | null }>
): Promise<MEShippingItem[]> {
  const supabase = createServiceClient()
  const variantIds = orderItems.map((i) => i.product_variant_id).filter(Boolean) as string[]

  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, product:products(weight_grams, length_cm, width_cm, height_cm)')
    .in('id', variantIds)

  return orderItems.flatMap((item) => {
    if (!item.product_variant_id) return []
    const variant = variants?.find((v) => v.id === item.product_variant_id)
    const productRaw = variant?.product
    const product = (Array.isArray(productRaw) ? productRaw[0] : productRaw) as {
      weight_grams: number | null; length_cm: number | null
      width_cm: number | null; height_cm: number | null
    } | null | undefined

    if (!product?.weight_grams) return []
    return [{
      weight: product.weight_grams / 1000,
      width: product.width_cm ?? 10,
      height: product.height_cm ?? 5,
      length: product.length_cm ?? 20,
      quantity: item.quantity,
    }]
  })
}

// Called from the MP payment webhook after payment is confirmed
export async function purchaseShippingLabel(orderId: string): Promise<void> {
  const supabase = createServiceClient()
  const rawOrder = await fetchOrderForLabel(orderId)

  if (!rawOrder) throw new Error(`Pedido ${orderId} não encontrado`)
  if (!rawOrder.melhor_envio_service_id) {
    console.log(`[Label] pedido ${orderId} sem service_id — checkout sem frete ME`)
    return
  }

  type CustomerRaw = { name: string; email: string | null; phone: string | null; cpf_cnpj: string | null; address: unknown }
  const customerRaw = (Array.isArray(rawOrder.customer) ? rawOrder.customer[0] : rawOrder.customer) as CustomerRaw | null
  if (!customerRaw) throw new Error('Cliente não encontrado')

  const customerAddress = customerRaw.address as {
    street: string; number: string; complement: string | null
    neighborhood: string; city: string; state: string; zip: string
  } | null
  if (!customerAddress) throw new Error('Endereço do cliente não cadastrado')

  type ItemRaw = { quantity: number; product_variant_id: string | null }
  const orderItems = rawOrder.items as unknown as ItemRaw[]
  const items = await buildShippingItems(orderItems)

  if (items.length === 0) throw new Error('Nenhum produto com dimensões para gerar etiqueta')

  const to: MEAddressField = {
    name: customerRaw.name,
    phone: (customerRaw.phone ?? '').replace(/\D/g, ''),
    email: customerRaw.email ?? '',
    document: (customerRaw.cpf_cnpj ?? '').replace(/\D/g, ''),
    address: customerAddress.street,
    number: customerAddress.number,
    complement: customerAddress.complement ?? '',
    district: customerAddress.neighborhood,
    city: customerAddress.city,
    state_abbr: customerAddress.state,
    postal_code: customerAddress.zip.replace(/\D/g, ''),
    country_id: 'BR',
  }

  // 1. Add to ME cart
  const meOrderId = await addToCart({
    serviceId: rawOrder.melhor_envio_service_id as number,
    from: buildStoreAddress(),
    to,
    items,
    orderId,
    totalValue: Number(rawOrder.total_amount),
  })

  // 2. Checkout (debits ME wallet)
  await checkoutCart([meOrderId])

  // 3. Save ME order ID
  await supabase
    .from('orders')
    .update({ melhor_envio_order_id: meOrderId, status: 'separating' })
    .eq('id', orderId)

  // 4. Try to generate label right away (works in production; sandbox needs ~5 min approval)
  try {
    await generateLabel([meOrderId])
    await new Promise((r) => setTimeout(r, 2000))
    const tracking = await getTrackingCode(meOrderId)
    if (tracking) {
      await supabase.from('orders').update({ tracking_code: tracking }).eq('id', orderId)
      console.log(`[Label] gerada — pedido ${orderId}, rastreio: ${tracking}`)
    }
  } catch {
    // Sandbox: checkout ainda não aprovado (aprovação automática em ~5 min)
    // Use "Gerar Etiqueta" no painel admin depois
    console.log(`[Label] generate adiado para ${orderId} — gere manualmente no admin`)
  }
}

// Called from admin panel when generate was deferred (e.g. sandbox approval delay)
export async function generateShippingLabel(
  orderId: string,
  meOrderId: string
): Promise<{ ok: true; tracking: string | null } | { ok: false; error: string }> {
  try {
    await generateLabel([meOrderId])
    await new Promise((r) => setTimeout(r, 2000))

    const tracking = await getTrackingCode(meOrderId)

    if (tracking) {
      const supabase = createServiceClient()
      await supabase.from('orders').update({ tracking_code: tracking }).eq('id', orderId)
    }

    return { ok: true, tracking }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar etiqueta'
    return { ok: false, error: msg }
  }
}

// Called from admin panel to get the print URL for a label
export async function getLabelPrintUrl(
  meOrderId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const url = await printLabel([meOrderId])
    return { ok: true, url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao obter link de impressão'
    return { ok: false, error: msg }
  }
}
