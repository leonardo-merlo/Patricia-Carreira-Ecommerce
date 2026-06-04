/**
 * lib/types.ts — Patrícia Carreira
 *
 * Fonte de verdade para todos os tipos do sistema.
 * Espelha 1:1 o schema Supabase definido no CLAUDE.md.
 *
 * Regras:
 *  - Nunca criar tipos inline nos componentes. Importar daqui.
 *  - Campos nullable no SQL são sempre `tipo | null` aqui (nunca undefined).
 *  - Tipos de UI (CartItem, FilterState) ficam na seção STORE — não vão para o DB.
 *  - Ao adicionar campo no Supabase, adicionar aqui primeiro.
 */

// ─────────────────────────────────────────────────────────────────────────────
// AUTH E PERFIS DE USUÁRIO
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "customer";

/**
 * user_profiles — extensão da tabela auth.users do Supabase.
 * 'admin'    → Henrique. Acesso total ao /admin.
 * 'customer' → Clientes do e-commerce. Acesso apenas à /conta.
 */
export type UserProfile = {
  id: string; // mesmo id de auth.users
  role: UserRole;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO — Produtos e Variantes
// ─────────────────────────────────────────────────────────────────────────────

export type ProductCategory = "bolsas" | "roupas" | "acessorios" | "bazar";
export type ProductSubcategory = "vestidos" | "batas" | null;

/** Tabela de medidas para roupas — exibida na página do produto */
export type ProductMeasurements = {
  [size: string]: string; // ex: { "P": "Busto 88cm, Comprimento 110cm", "M": "..." }
};

/**
 * product_variants — combinação de produto + tamanho + cor com estoque próprio.
 * FONTE DE VERDADE do estoque de produto acabado.
 * Nunca decrementar stock_quantity sem verificar disponibilidade primeiro.
 */
export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string; // ex: "BOL-TIRA-MARG-UNICO"
  size: string | null; // 'P' | 'M' | 'G' | 'Único' | null
  color: string | null;
  stock_quantity: number; // >= 0, nunca negativo
  created_at: string;
};

/**
 * products — produto base. Ex: "Bolsa Tiracolo Margaridas".
 *
 * ⚠️  weight_grams, length_cm, width_cm, height_cm são obrigatórios
 * antes de publicar o produto (necessário para cálculo de frete).
 */
export type Product = {
  id: string;
  name: string;
  slug: string; // usado na URL: /produto/[slug]
  description: string | null;
  category: ProductCategory;
  subcategory: ProductSubcategory;
  base_price: number; // preço varejo (B2C)
  wholesale_price: number | null; // null = não disponível no atacado
  is_active: boolean;
  images: string[]; // array de URLs (Supabase Storage)
  // Dados para cálculo de frete — obrigatórios antes de publicar
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  // Tabela de medidas — apenas para roupas
  measurements: ProductMeasurements | null;
  created_at: string;

  // Relação carregada via JOIN — presente só quando explicitamente solicitado
  variants?: ProductVariant[];
};

// Produto com variantes garantidamente carregadas (telas de admin)
export type ProductWithVariants = Product & {
  variants: ProductVariant[];
};

// ─────────────────────────────────────────────────────────────────────────────
// MATÉRIAS-PRIMAS e BOM
// ─────────────────────────────────────────────────────────────────────────────

export type RawMaterialUnit = "metro" | "unidade" | "kg" | "cm";

/**
 * raw_materials — estoque de matéria-prima.
 * Alerta quando stock_quantity < minimum_stock.
 */
export type RawMaterial = {
  id: string;
  name: string; // ex: "Couro Preto", "Zíper nº5 Dourado"
  unit: RawMaterialUnit;
  stock_quantity: number; // numeric(10,3) — permite frações (0.5 metro)
  minimum_stock: number; // threshold para alertas automáticos
  cost_per_unit: number | null;
  supplier: string | null;
  updated_at: string;
};

/**
 * bill_of_materials — "Para produzir 1 unidade de [variant], precisa de [qty] de [material]"
 * ⚠️  Precisa ser mapeado com Henrique antes de usar a tela de OP.
 */
export type BillOfMaterial = {
  id: string;
  product_variant_id: string;
  raw_material_id: string;
  quantity_needed: number; // quantidade POR unidade produzida

  // Relações opcionais
  raw_material?: RawMaterial;
  product_variant?: ProductVariant;
};

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

export type CustomerType = "retail" | "wholesale";

export type CustomerAddress = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string; // sigla: "RJ", "SP"
  zip: string; // formato: "28930-000"
};

export type Customer = {
  id: string;
  user_id: string | null; // null = guest checkout (sem conta)
  type: CustomerType;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  address: CustomerAddress | null;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CUPONS DE DESCONTO
// ─────────────────────────────────────────────────────────────────────────────

export type CouponType = "percent" | "fixed";

export type Coupon = {
  id: string;
  code: string; // ex: "BEMVINDO50" — único, case-insensitive
  type: CouponType;
  value: number; // 50 = 50% ou R$50,00 dependendo do type
  min_order_value: number; // pedido mínimo para aplicar (0 = sem mínimo)
  max_uses: number | null; // null = ilimitado (global)
  max_uses_per_user: number | null; // null = sem limite por usuário
  uses_count: number;
  valid_from: string;
  valid_until: string | null; // null = sem expiração
  is_active: boolean;
  description: string | null; // uso interno
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status de pedido.
 * retail:    pending → paid → separating → shipped → delivered | cancelled
 * wholesale: pending → confirmed → in_production → shipped → delivered | cancelled
 */
export type OrderStatus =
  | "pending"
  | "paid"
  | "separating"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed";
export type PaymentMethod = "pix" | "credit_card" | "boleto";

export type OrderItem = {
  id: string;
  order_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number; // snapshot — imutável após criação do pedido
  created_at: string;

  // Relações opcionais
  product_variant?: ProductVariant & { product?: Product };
};

export type Order = {
  id: string;
  customer_id: string;
  type: CustomerType;
  status: OrderStatus;
  total_amount: number;
  discount_amount: number; // valor do cupom aplicado (0 se nenhum)
  shipping_amount: number; // valor do frete (0 se ainda não calculado)
  payment_status: PaymentStatus;
  payment_id: string | null; // ID externo MercadoPago
  payment_method: PaymentMethod | null;
  shipping_method: string | null; // transportadora escolhida no checkout
  tracking_code: string | null; // código para o cliente rastrear
  coupon_id: string | null;
  nfe_number: string | null; // número da NF-e emitida
  nfe_url: string | null; // URL do DANFE para download
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Relações opcionais
  customer?: Customer;
  items?: OrderItem[];
  coupon?: Coupon;
};

// ─────────────────────────────────────────────────────────────────────────────
// LISTA DE DESEJOS
// ─────────────────────────────────────────────────────────────────────────────

export type Wishlist = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;

  // Relação opcional
  product?: Product;
};

// ─────────────────────────────────────────────────────────────────────────────
// PARCEIROS / AFILIADOS
// ─────────────────────────────────────────────────────────────────────────────

export type PartnerType = "affiliate" | "wholesale_partner" | "other";

export type Partner = {
  id: string;
  name: string;
  type: PartnerType;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  commission_pct: number | null; // % de comissão para afiliados
  payment_day: number | null; // dia do mês para pagamento (1–28)
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type PartnerTask = {
  id: string;
  partner_id: string;
  title: string;
  due_date: string | null; // ISO date: "2026-06-15"
  is_done: boolean;
  created_at: string;

  // Relação opcional
  partner?: Partner;
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDENS DE PRODUÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status de ordem de produção.
 * draft → materials_checked → approved → in_progress → completed | cancelled
 * ⚠️  Henrique aprova manualmente. Nunca avançar automaticamente se faltar MP.
 */
export type ProductionOrderStatus =
  | "draft"
  | "materials_checked"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Detalhe de MP faltante — armazenado em missing_materials (jsonb) */
export type MissingMaterial = {
  material_id: string;
  material_name: string;
  unit: RawMaterialUnit;
  needed: number;
  available: number;
  missing: number; // needed - available
};

export type ProductionOrderItem = {
  id: string;
  production_order_id: string;
  product_variant_id: string;
  quantity_requested: number;
  quantity_produced: number; // atualizado ao concluir
  materials_sufficient: boolean | null;
  missing_materials: MissingMaterial[] | null;

  // Relações opcionais
  product_variant?: ProductVariant & { product?: Product };
};

export type ProductionOrder = {
  id: string;
  order_id: string | null; // nullable: OP pode ser avulsa
  status: ProductionOrderStatus;
  notes: string | null;
  created_by: string; // default 'henrique'
  created_at: string;
  updated_at: string;

  // Relações opcionais
  order?: Order;
  items?: ProductionOrderItem[];
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDITORIA DE ESTOQUE
// ─────────────────────────────────────────────────────────────────────────────

export type StockAdjustmentReason =
  | "compra_mp" // compra de matéria-prima
  | "ajuste_inventario" // contagem física diverge do sistema
  | "perda" // material danificado ou extraviado
  | "devolucao" // devolução de cliente
  | "producao_concluida" // OP concluída (automático)
  | "venda"; // venda no e-commerce (automático)

export type StockAdjustmentTarget = "product_variant" | "raw_material";

/** Registro imutável de toda alteração de estoque */
export type StockAdjustment = {
  id: string;
  target: StockAdjustmentTarget;
  target_id: string;
  quantity_before: number;
  quantity_after: number;
  delta: number; // quantity_after - quantity_before (pode ser negativo)
  reason: StockAdjustmentReason;
  notes: string | null;
  created_by: string;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE UI — Store (E-commerce público)
// Estes tipos NÃO têm tabela no banco. São usados apenas no frontend.
// ─────────────────────────────────────────────────────────────────────────────

/** Item dentro do carrinho */
export type CartItem = {
  variant: ProductVariant & { product: Product };
  quantity: number;
};

/** Estado do carrinho — gerenciado via Context ou Zustand no cliente */
export type Cart = {
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  total: number;
  item_count: number;
  coupon: Coupon | null;
};

/** Badges exibidos no card de produto */
export type ProductBadge = "Lançamento" | "Última Peça" | "Esgotado" | null;

/** Estado dos filtros na página de categoria */
export type FilterState = {
  subcategories: string[];
  colors: string[];
  sizes: string[];
  price_min: number | null;
  price_max: number | null;
  sort: "relevance" | "price_asc" | "price_desc" | "newest";
};

/** Opção de frete retornada pela Melhor Envio */
export type ShippingOption = {
  id: string;
  name: string; // ex: "SEDEX", "PAC", "Jadlog"
  price: number;
  delivery_days: number;
  logo_url: string | null;
};

/** Payload do formulário de checkout */
export type CheckoutFormData = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: CustomerAddress;
  create_account: boolean; // se true, cria UserProfile com role 'customer'
  password?: string; // obrigatório se create_account = true
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE UI — Admin
// ─────────────────────────────────────────────────────────────────────────────

/** Resumo para o dashboard do admin */
export type DashboardStats = {
  orders_today: number;
  orders_pending: number;
  revenue_month: number;
  low_stock_alerts: number;
  production_orders_active: number;
};

/** Alerta de estoque mínimo */
export type StockAlert = {
  type: "raw_material" | "product_variant";
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
};

/** Resultado do check_materials() para uma OP */
export type MaterialCheckResult = {
  all_sufficient: boolean;
  items: Array<{
    product_variant_id: string;
    variant_name: string;
    materials: Array<MissingMaterial & { is_sufficient: boolean }>;
  }>;
};

/** Resultado do cálculo de frete (Melhor Envio) */
export type ShippingQuote = {
  options: ShippingOption[];
  origin_zip: string;
  destination_zip: string;
  package: {
    weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
};

// ─── Financeiro ───────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Matéria-Prima',
  'Marketing',
  'Frete / Logística',
  'Fornecedores',
  'Serviços / Software',
  'Impostos',
  'Salários',
  'Outros',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export type PaymentMethod =
  | 'pix'
  | 'boleto'
  | 'cartao'
  | 'dinheiro'
  | 'transferencia'

export type RecurrenceMonths = 1 | 12

export type AccountPayable = {
  id: string
  description: string
  amount: number
  due_date: string
  paid_at: string | null
  category: ExpenseCategory
  creditor: string | null
  payment_method: PaymentMethod | null
  is_recurring: boolean
  recurrence_months: RecurrenceMonths | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AccountPayableStatus = 'pending' | 'overdue' | 'paid'

export function getAccountStatus(account: AccountPayable): AccountPayableStatus {
  if (account.paid_at !== null) return 'paid'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(account.due_date + 'T00:00:00')
  return due < today ? 'overdue' : 'pending'
}
