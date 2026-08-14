import { createServiceClient } from '@/lib/supabase/service'
import {
  addToCart,
  checkoutCart,
  generateLabel,
  getTrackingCode,
  type MEAddress,
  type MECartProduct,
  type MEVolume,
} from '@/lib/integrations/melhor-envio'
import { meDocumentFields, onlyDigits } from '@/lib/documento'

export function buildStoreAddress(): MEAddress {
  // A loja é PJ: o CNPJ é o documento que identifica o remetente. STORE_DOCUMENTO
  // fica como alternativa para quando só houver CPF cadastrado.
  const documento = meDocumentFields(process.env.STORE_CNPJ)
  const fallback = meDocumentFields(process.env.STORE_DOCUMENTO)

  return {
    name: process.env.STORE_NOME ?? 'Patricia Carreira',
    phone: onlyDigits(process.env.STORE_TELEFONE),
    email: process.env.STORE_EMAIL ?? '',
    ...(documento.company_document || documento.document ? documento : fallback),
    address: process.env.STORE_LOGRADOURO ?? '',
    number: process.env.STORE_NUMERO ?? '',
    complement: process.env.STORE_COMPLEMENTO ?? '',
    district: process.env.STORE_BAIRRO ?? '',
    city: process.env.STORE_CIDADE ?? '',
    state_abbr: (process.env.STORE_ESTADO ?? '').trim().toUpperCase(),
    postal_code: onlyDigits(process.env.STORE_CEP_ORIGEM),
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
      items:order_items(quantity, unit_price, product_name, product_variant_id)
    `)
    .eq('id', orderId)
    .maybeSingle()

  return rawOrder
}

type OrderItemForShipping = {
  quantity: number
  unit_price: number
  product_name: string | null
  product_variant_id: string | null
}

// O ME separa as duas coisas: products é o conteúdo declarado (o que é e quanto
// vale, usado no seguro e na nota do transportador) e volumes são os pacotes
// físicos. Item com quantidade 2 vira um product de quantidade 2 e dois volumes.
async function buildCartPayload(
  orderItems: OrderItemForShipping[]
): Promise<{ products: MECartProduct[]; volumes: MEVolume[] }> {
  const supabase = createServiceClient()
  const variantIds = orderItems.map((i) => i.product_variant_id).filter(Boolean) as string[]

  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, product:products(name, weight_grams, length_cm, width_cm, height_cm)')
    .in('id', variantIds)

  const products: MECartProduct[] = []
  const volumes: MEVolume[] = []

  for (const item of orderItems) {
    if (!item.product_variant_id) continue

    const variant = variants?.find((v) => v.id === item.product_variant_id)
    const productRaw = variant?.product
    const product = (Array.isArray(productRaw) ? productRaw[0] : productRaw) as {
      name: string | null; weight_grams: number | null; length_cm: number | null
      width_cm: number | null; height_cm: number | null
    } | null | undefined

    if (!product?.weight_grams) continue

    products.push({
      name: item.product_name ?? product.name ?? 'Produto',
      quantity: item.quantity,
      unitary_value: Number(item.unit_price),
    })

    for (let i = 0; i < item.quantity; i++) {
      volumes.push({
        weight: product.weight_grams / 1000,
        width: product.width_cm ?? 10,
        height: product.height_cm ?? 5,
        length: product.length_cm ?? 20,
      })
    }
  }

  return { products, volumes }
}

// Called from the MP payment webhook after payment is confirmed
export async function purchaseShippingLabel(orderId: string): Promise<void> {
  const supabase = createServiceClient()
  const rawOrder = await fetchOrderForLabel(orderId)

  if (!rawOrder) throw new Error(`Pedido ${orderId} não encontrado`)
  if (!rawOrder.melhor_envio_service_id) {
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

  const orderItems = rawOrder.items as unknown as OrderItemForShipping[]
  const { products, volumes } = await buildCartPayload(orderItems)

  if (products.length === 0) throw new Error('Nenhum produto com dimensões para gerar etiqueta')

  const to: MEAddress = {
    name: customerRaw.name,
    phone: onlyDigits(customerRaw.phone),
    email: customerRaw.email ?? '',
    ...meDocumentFields(customerRaw.cpf_cnpj),
    address: customerAddress.street,
    number: customerAddress.number,
    complement: customerAddress.complement ?? '',
    district: customerAddress.neighborhood,
    city: customerAddress.city,
    state_abbr: customerAddress.state.trim().toUpperCase(),
    postal_code: onlyDigits(customerAddress.zip),
    country_id: 'BR',
  }

  // 1. Add to ME cart
  const meOrderId = await addToCart({
    serviceId: rawOrder.melhor_envio_service_id as number,
    from: buildStoreAddress(),
    to,
    products,
    volumes,
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
    }
  } catch {
    // Sandbox: checkout ainda não aprovado (aprovação automática em ~5 min)
    // Use "Gerar Etiqueta" no painel admin depois
  }
}
