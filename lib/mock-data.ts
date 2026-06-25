/**
 * lib/mock-data.ts — Patrícia Carreira
 *
 * Dados mockados para desenvolvimento sem Supabase.
 * Espelha 1:1 os tipos de lib/types.ts e o schema do CLAUDE.md.
 *
 * ─── Como usar ────────────────────────────────────────────────────────────
 *  import { MOCK_PRODUCTS, getProductBySlug } from '@/lib/mock-data'
 *
 *  Substituição por Supabase real é line-for-line:
 *
 *    // MOCK:
 *    const products = getProductsByCategory('bolsas')
 *
 *    // REAL:
 *    const { data: products } = await supabase
 *      .from('products')
 *      .select('*, variants:product_variants(*)')
 *      .eq('category', 'bolsas')
 *      .eq('is_active', true)
 *
 * ─── Imagens ───────────────────────────────────────────────────────────────
 *  Todos os arquivos estão em: /images/products/imagens/[filename]
 *  Os nomes dos arquivos são os mesmos fornecidos pelo Henrique.
 *
 * ─── O QUE FOI INVENTADO — validar com Henrique ────────────────────────────
 *  1. Cores de vestidos (Havana, Dani, Fiji, etc.): nomeadas "Variante 1/2/3"
 *     → Henrique precisa informar os nomes reais das cores/estampas
 *  2. Cores de batas (Asteca, Yoko, Maia, etc.): nomeadas "Variante 1/2"
 *     → Idem
 *  3. Tamanhos P/M/G para vestidos: assumidos como padrão
 *     → Confirmar se todos têm P/M/G ou se algum é Tamanho Único
 *  4. Medidas de tamanho (measurements): todas estimadas — substituir pelos dados reais
 *  5. Peso e dimensões (weight_grams, length_cm, etc.): estimados por categoria
 *  6. Preços no atacado: estimados em 60% do preço de varejo
 *  7. Estoque: valores fictícios para desenvolvimento
 *  8. Descrições de vestidos e batas: criadas com base na estética da marca
 *     → Substituir pelos textos oficiais quando disponíveis
 *  9. Páginas não incluídas por falta de identificação:
 *     - Vestidos páginas 51–56 (6 variações sem nome de produto)
 *     - Batas páginas 86–88 (3 variações sem nome de produto)
 *     - Página 101 "Clique aqui" (não é produto)
 *  10. "Sempre à Mão" (pag.38): a descrição no markdown parece cópia da Wood Stock
 *      → Verificar se é um produto diferente ou variante da Wood Stock
 *
 * ─── ATENÇÃO ───────────────────────────────────────────────────────────────
 *  Nunca importar em código de produção após integrar Supabase.
 */

import type {
  Product,
  ProductVariant,
  Customer,
  Order,
  RawMaterial,
  Coupon,
  Partner,
  PartnerTask,
  StockAlert,
  DashboardStats,
  UserProfile,
  NfeStatus,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const uuid = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();

const img = (filename: string) => `/images/products/imagens/${filename}`
const img3 = (filename: string) => `/images/refs3/${filename}`;

// ─────────────────────────────────────────────────────────────────────────────
// PERFIS DE USUÁRIO
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_USER_PROFILES: UserProfile[] = [
  {
    id: uuid(1),
    role: "admin",
    name: "Henrique",
    phone: "(73) 99999-0001",
    cpf: "000.000.000-01",
    created_at: daysAgo(180),
  },
  {
    id: uuid(2),
    role: "customer",
    name: "Ana Paula Ferreira",
    phone: "(22) 99812-3456",
    cpf: "123.456.789-00",
    created_at: daysAgo(45),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUTOS — BOLSAS
// ─────────────────────────────────────────────────────────────────────────────

const BOLSAS: Product[] = [
  // ── Bolsa Briana ──────────────────────────────────────────────────────────
  {
    id: uuid(101),
    name: "Bolsa Briana",
    slug: "bolsa-briana",
    description:
      "A Bolsa Briana combina praticidade e elegância. Feita de lona com detalhes e alça em couro legítimo, destaca-se pela durabilidade e sofisticação. Design tiracolo com alça ajustável, permite que seja usada de diferentes formas. Compacta, mas surpreendentemente espaçosa, com bolsos interno e externo.",
    category: "bolsas",
    subcategory: null,
    base_price: 479,
    wholesale_price: 287,
    is_active: true,
    images: [
      img3("bolsa-briana.jpeg"),
      img("bolsa_briana_azul_turquesa_0.jpeg"),
      img("bolsa_briana_mostarda_0.jpeg"),
      img("bolsa_briana_vinho_0.jpeg"),
    ],
    weight_grams: 420,
    length_cm: 26,
    width_cm: 8,
    height_cm: 20,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(20),
    variants: [
      { id: uuid(1001), product_id: uuid(101), sku: "BOL-BRIA-TURQ-UNICO", size: "Único", color: "Azul Turquesa", stock_quantity: 4, created_at: daysAgo(20) },
      { id: uuid(1002), product_id: uuid(101), sku: "BOL-BRIA-CAQUI-UNICO", size: "Único", color: "Cáqui", stock_quantity: 5, created_at: daysAgo(20) },
      { id: uuid(1003), product_id: uuid(101), sku: "BOL-BRIA-LAR-UNICO", size: "Único", color: "Laranja", stock_quantity: 3, created_at: daysAgo(20) },
      { id: uuid(1004), product_id: uuid(101), sku: "BOL-BRIA-MAR-UNICO", size: "Único", color: "Marinho", stock_quantity: 6, created_at: daysAgo(20) },
      { id: uuid(1005), product_id: uuid(101), sku: "BOL-BRIA-MOS-UNICO", size: "Único", color: "Mostarda", stock_quantity: 4, created_at: daysAgo(20) },
      { id: uuid(1006), product_id: uuid(101), sku: "BOL-BRIA-VMUS-UNICO", size: "Único", color: "Verde Musgo", stock_quantity: 3, created_at: daysAgo(20) },
      { id: uuid(1007), product_id: uuid(101), sku: "BOL-BRIA-VERM-UNICO", size: "Único", color: "Vermelha", stock_quantity: 2, created_at: daysAgo(20) },
      { id: uuid(1008), product_id: uuid(101), sku: "BOL-BRIA-VINH-UNICO", size: "Único", color: "Vinho", stock_quantity: 5, created_at: daysAgo(20) },
    ],
  },

  // ── Bolsa Flora ───────────────────────────────────────────────────────────
  {
    id: uuid(102),
    name: "Bolsa Flora",
    slug: "bolsa-flora",
    description:
      "A Bolsa Flora combina a rusticidade da lona com a elegância do couro. Alças resistentes em couro legítimo e bordado delicado que a torna única. Interior forrado com bolso externo e três bolsos internos, sendo um com zíper. Une charme e funcionalidade em design exclusivo.",
    category: "bolsas",
    subcategory: null,
    base_price: 599,
    wholesale_price: 359,
    is_active: false,
    images: [
      img("bolsa_flora_cáqui_0.jpeg"),
      img("bolsa_flora_marinho_0.jpeg"),
      img("bolsa_flora_mostarda_0.jpeg"),
    ],
    weight_grams: 520,
    length_cm: 30,
    width_cm: 10,
    height_cm: 24,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(15),
    variants: [
      { id: uuid(1011), product_id: uuid(102), sku: "BOL-FLOR-TURQ-UNICO", size: "Único", color: "Azul Turquesa", stock_quantity: 3, created_at: daysAgo(15) },
      { id: uuid(1012), product_id: uuid(102), sku: "BOL-FLOR-CAQUI-UNICO", size: "Único", color: "Cáqui", stock_quantity: 5, created_at: daysAgo(15) },
      { id: uuid(1013), product_id: uuid(102), sku: "BOL-FLOR-LAR-UNICO", size: "Único", color: "Laranja", stock_quantity: 2, created_at: daysAgo(15) },
      { id: uuid(1014), product_id: uuid(102), sku: "BOL-FLOR-MAR-UNICO", size: "Único", color: "Marinho", stock_quantity: 4, created_at: daysAgo(15) },
      { id: uuid(1015), product_id: uuid(102), sku: "BOL-FLOR-MOS-UNICO", size: "Único", color: "Mostarda", stock_quantity: 6, created_at: daysAgo(15) },
      { id: uuid(1016), product_id: uuid(102), sku: "BOL-FLOR-VMUS-UNICO", size: "Único", color: "Verde Musgo", stock_quantity: 3, created_at: daysAgo(15) },
      { id: uuid(1017), product_id: uuid(102), sku: "BOL-FLOR-VINH-UNICO", size: "Único", color: "Vinho", stock_quantity: 4, created_at: daysAgo(15) },
    ],
  },

  // ── Bolsa Liberty ─────────────────────────────────────────────────────────
  {
    id: uuid(103),
    name: "Bolsa Liberty",
    slug: "bolsa-liberty",
    description:
      "A Bolsa Liberty combina praticidade, durabilidade e estilo. Feita de lona com detalhes em couro legítimo, possui alça ajustável que permite diferentes formas de uso. Formato amplo e estruturado com aplicações de couro e bordados geométricos. Paleta de cores harmoniosa que reflete elegância e exclusividade.",
    category: "bolsas",
    subcategory: null,
    base_price: 579,
    wholesale_price: 347,
    is_active: true,
    images: [
      img("bolsa_liberty__0.jpeg"),
      img("bolsa_liberty__0.png"),
    ],
    weight_grams: 550,
    length_cm: 34,
    width_cm: 12,
    height_cm: 26,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(25),
    variants: [
      { id: uuid(1021), product_id: uuid(103), sku: "BOL-LIB-NAT-UNICO", size: "Único", color: "Natural", stock_quantity: 3, created_at: daysAgo(25) },
    ],
  },

  // ── Bolsa Lyra ────────────────────────────────────────────────────────────
  {
    id: uuid(104),
    name: "Bolsa Lyra",
    slug: "bolsa-lyra",
    description:
      "A Bolsa Lyra é a combinação perfeita de amplitude e leveza. Projetada para quem precisa de espaço sem abrir mão do estilo, ela proporciona conforto ao carregá-la mesmo quando cheia. Bolso interno para organizar itens essenciais com facilidade. Bordados delicados e coloridos com aplicações em couro.",
    category: "bolsas",
    subcategory: null,
    base_price: 469,
    wholesale_price: 281,
    is_active: false,
    images: [
      img("bolsa_lyra_cáqui_0.jpeg"),
      img("bolsa_lyra_marinho_0.jpeg"),
      img("bolsa_lyra_mostarda_0.jpeg"),
    ],
    weight_grams: 460,
    length_cm: 36,
    width_cm: 10,
    height_cm: 28,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(30),
    variants: [
      { id: uuid(1031), product_id: uuid(104), sku: "BOL-LYRA-CAQUI-UNICO", size: "Único", color: "Cáqui", stock_quantity: 4, created_at: daysAgo(30) },
      { id: uuid(1032), product_id: uuid(104), sku: "BOL-LYRA-MAR-UNICO", size: "Único", color: "Marinho", stock_quantity: 3, created_at: daysAgo(30) },
      { id: uuid(1033), product_id: uuid(104), sku: "BOL-LYRA-MOS-UNICO", size: "Único", color: "Mostarda", stock_quantity: 5, created_at: daysAgo(30) },
      { id: uuid(1034), product_id: uuid(104), sku: "BOL-LYRA-VMUS-UNICO", size: "Único", color: "Verde Musgo", stock_quantity: 2, created_at: daysAgo(30) },
      { id: uuid(1035), product_id: uuid(104), sku: "BOL-LYRA-VERM-UNICO", size: "Único", color: "Vermelho", stock_quantity: 3, created_at: daysAgo(30) },
    ],
  },

  // ── Bolsa Mandala ─────────────────────────────────────────────────────────
  {
    id: uuid(105),
    name: "Bolsa Mandala",
    slug: "bolsa-mandala",
    description:
      "A Bolsa Mandala é perfeita para quem busca estilo e versatilidade em um único acessório. Grande e espaçosa, ideal tanto para o dia a dia quanto para pequenas viagens. Confeccionada em lona com detalhes em couro. O delicado bordado confere exclusividade, enquanto o bolso externo e os bolsos internos garantem praticidade.",
    category: "bolsas",
    subcategory: null,
    base_price: 629,
    wholesale_price: 377,
    is_active: true,
    images: [
      img("bolsa_mandala_verde_musgo_0.jpeg"),
      img("bolsa_mandala_marinho_0.jpeg"),
      img("bolsa_mandala_vinho_0.jpeg"),
    ],
    weight_grams: 600,
    length_cm: 38,
    width_cm: 14,
    height_cm: 30,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(18),
    variants: [
      { id: uuid(1041), product_id: uuid(105), sku: "BOL-MAND-CAQUI-UNICO", size: "Único", color: "Cáqui", stock_quantity: 3, created_at: daysAgo(18) },
      { id: uuid(1042), product_id: uuid(105), sku: "BOL-MAND-MAR-UNICO", size: "Único", color: "Marinho", stock_quantity: 4, created_at: daysAgo(18) },
      { id: uuid(1043), product_id: uuid(105), sku: "BOL-MAND-MOS-UNICO", size: "Único", color: "Mostarda", stock_quantity: 2, created_at: daysAgo(18) },
      { id: uuid(1044), product_id: uuid(105), sku: "BOL-MAND-VMUS-UNICO", size: "Único", color: "Verde Musgo", stock_quantity: 5, created_at: daysAgo(18) },
      { id: uuid(1045), product_id: uuid(105), sku: "BOL-MAND-VINH-UNICO", size: "Único", color: "Vinho", stock_quantity: 3, created_at: daysAgo(18) },
    ],
  },

  // ── Bolsa Nirvana ─────────────────────────────────────────────────────────
  {
    id: uuid(106),
    name: "Bolsa Nirvana",
    slug: "bolsa-nirvana",
    description:
      "A Bolsa Nirvana é uma celebração de estilo e versatilidade. Bolsos estrategicamente posicionados interna e externamente garantem praticidade e organização. Seu destaque está no belíssimo bordado frontal, que combina cores vibrantes e formas harmônicas. Personalidade única que reflete autenticidade e sofisticação.",
    category: "bolsas",
    subcategory: null,
    base_price: 569,
    wholesale_price: 341,
    is_active: true,
    images: [
      img3("bolsa-nirvana.jpeg"),
      img("bolsa_nirvana_azul_turquesa_0.jpeg"),
      img("bolsa_nirvana_marinho_0.jpeg"),
      img("bolsa_nirvana_mostarda_0.jpeg"),
    ],
    weight_grams: 490,
    length_cm: 30,
    width_cm: 10,
    height_cm: 22,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(10),
    variants: [
      { id: uuid(1051), product_id: uuid(106), sku: "BOL-NIRV-TURQ-UNICO", size: "Único", color: "Azul Turquesa", stock_quantity: 3, created_at: daysAgo(10) },
      { id: uuid(1052), product_id: uuid(106), sku: "BOL-NIRV-CAQUI-UNICO", size: "Único", color: "Cáqui", stock_quantity: 4, created_at: daysAgo(10) },
      { id: uuid(1053), product_id: uuid(106), sku: "BOL-NIRV-MAR-UNICO", size: "Único", color: "Marinho", stock_quantity: 2, created_at: daysAgo(10) },
      { id: uuid(1054), product_id: uuid(106), sku: "BOL-NIRV-MOS-UNICO", size: "Único", color: "Mostarda", stock_quantity: 5, created_at: daysAgo(10) },
      { id: uuid(1055), product_id: uuid(106), sku: "BOL-NIRV-VMUS-UNICO", size: "Único", color: "Verde Musgo", stock_quantity: 3, created_at: daysAgo(10) },
    ],
  },

  // ── Bolsa Romana ──────────────────────────────────────────────────────────
  {
    id: uuid(107),
    name: "Bolsa Romana",
    slug: "bolsa-romana",
    description:
      "A Bolsa Romana é a combinação ideal de charme e praticidade. Confeccionada em lona com detalhes em couro legítimo, seu bordado dá vida a desenhos que encantam pelo cuidado e expressão artística. Fechamento com mosquetões internos e ímã. Alça com regulagem e bolso interno.",
    category: "bolsas",
    subcategory: null,
    base_price: 469,
    wholesale_price: 281,
    is_active: true,
    images: [
      img3("bolsa-romana.jpeg"),
      img("produto_pagina_37_romana_0.jpeg"),
    ],
    weight_grams: 430,
    length_cm: 28,
    width_cm: 9,
    height_cm: 22,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(40),
    variants: [
      { id: uuid(1061), product_id: uuid(107), sku: "BOL-ROMA-NAT-UNICO", size: "Único", color: "Natural", stock_quantity: 0, created_at: daysAgo(40) },
    ],
  },

  // ── Bolsa Sempre à Mão ────────────────────────────────────────────────────
  {
    id: uuid(108),
    name: "Bolsa Sempre à Mão",
    slug: "bolsa-sempre-a-mao",
    description:
      "A Bolsa Sempre à Mão é a companheira ideal para o cotidiano. Confeccionada em lona com detalhes em couro legítimo bordado. Fecho seguro com mosquetões internos e ímã. Alças reguláveis e bolsos organizadores internos para manter seus itens sempre acessíveis.",
    category: "bolsas",
    subcategory: null,
    base_price: 499,
    wholesale_price: 299,
    is_active: false,
    images: [
      img("produto_pagina_38_sempre_à_mão_0.png"),
      img("produto_pagina_38_sempre_à_mão_1.jpeg"),
    ],
    weight_grams: 580,
    length_cm: 32,
    width_cm: 12,
    height_cm: 26,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(35),
    variants: [
      { id: uuid(1071), product_id: uuid(108), sku: "BOL-SEMP-NAT-UNICO", size: "Único", color: "Natural", stock_quantity: 2, created_at: daysAgo(35) },
    ],
  },

  // ── Mochila Wood Stock ────────────────────────────────────────────────────
  {
    id: uuid(109),
    name: "Mochila Wood Stock",
    slug: "mochila-wood-stock",
    description:
      "A Mochila Wood Stock traz o equilíbrio perfeito entre charme artesanal e praticidade. Confeccionada em lona com detalhes em couro legítimo bordado. Fecho de mosquetões internos e ímã, alças reguláveis confortáveis. Interior com bolsos organizadores.",
    category: "bolsas",
    subcategory: null,
    base_price: 499,
    wholesale_price: 299,
    is_active: true,
    images: [
      img("produto_pagina_39_wood_stock_0.jpeg"),
      img("produto_pagina_40_wood_stock_0.jpeg"),
    ],
    weight_grams: 620,
    length_cm: 30,
    width_cm: 14,
    height_cm: 38,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(45),
    variants: [
      { id: uuid(1081), product_id: uuid(109), sku: "MOC-WOOD-V1-UNICO", size: "Único", color: "Variante 1", stock_quantity: 3, created_at: daysAgo(45) },
      { id: uuid(1082), product_id: uuid(109), sku: "MOC-WOOD-V2-UNICO", size: "Único", color: "Variante 2", stock_quantity: 2, created_at: daysAgo(45) },
    ],
  },

  // ── Pochete ───────────────────────────────────────────────────────────────
  {
    id: uuid(110),
    name: "Pochete",
    slug: "pochete",
    description:
      "A pochete é confeccionada em lona com acabamentos em couro legítimo. Conta com quatro bolsos práticos facilitando a organização de itens essenciais. Alça ajustável permite que seja usada como pochete ou bolsa tiracolo. Funcionalidade e estilo em um design exclusivo.",
    category: "bolsas",
    subcategory: null,
    base_price: 399,
    wholesale_price: 239,
    is_active: true,
    images: [
      img3("pochetes.jpeg"),
      img("produto_pagina_41_pochete_0.jpeg"),
      img("produto_pagina_42_pochete_0.jpeg"),
      img("produto_pagina_43_pochete_0.jpeg"),
    ],
    weight_grams: 280,
    length_cm: 22,
    width_cm: 6,
    height_cm: 16,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(50),
    variants: [
      { id: uuid(1091), product_id: uuid(110), sku: "POCH-V1-UNICO", size: "Único", color: "Variante 1", stock_quantity: 4, created_at: daysAgo(50) },
      { id: uuid(1092), product_id: uuid(110), sku: "POCH-V2-UNICO", size: "Único", color: "Variante 2", stock_quantity: 3, created_at: daysAgo(50) },
      { id: uuid(1093), product_id: uuid(110), sku: "POCH-V3-UNICO", size: "Único", color: "Variante 3", stock_quantity: 5, created_at: daysAgo(50) },
      { id: uuid(1094), product_id: uuid(110), sku: "POCH-V4-UNICO", size: "Único", color: "Variante 4", stock_quantity: 2, created_at: daysAgo(50) },
    ],
  },

  // ── Bolsa Maia ────────────────────────────────────────────────────────────
  {
    id: uuid(111),
    name: "Bolsa Maia",
    slug: "bolsa-maia",
    description:
      "A Bolsa Maia é uma peça atemporal que une beleza artesanal e funcionalidade. Confeccionada em lona com detalhes em couro legítimo e bordado delicado, é a escolha perfeita para o dia a dia. Alça ajustável, bolso interno e externo — tudo pensado para quem não abre mão de estilo.",
    category: "bolsas",
    subcategory: null,
    base_price: 519,
    wholesale_price: 311,
    is_active: true,
    images: [
      img3("bolsa-maya..jpeg"),
      img3("bolsa-maya2.jpeg"),
      img3("bolsa-maya3.jpeg"),
      img3("bolsa-maya4.jpeg"),
      img3("bolsa-maya5.jpeg"),
    ],
    weight_grams: 440,
    length_cm: 28,
    width_cm: 9,
    height_cm: 21,
    measurements: null,
    ncm: null,
    cfop: null,
    created_at: daysAgo(3),
    variants: [
      { id: uuid(1101), product_id: uuid(111), sku: "BOL-MAIA-V1-UNICO", size: "Único", color: "Variante 1", stock_quantity: 5, created_at: daysAgo(3) },
      { id: uuid(1102), product_id: uuid(111), sku: "BOL-MAIA-V2-UNICO", size: "Único", color: "Variante 2", stock_quantity: 4, created_at: daysAgo(3) },
      { id: uuid(1103), product_id: uuid(111), sku: "BOL-MAIA-V3-UNICO", size: "Único", color: "Variante 3", stock_quantity: 3, created_at: daysAgo(3) },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUTOS — VESTIDOS
// Cada vestido tem variantes P/M/G (tamanhos inventados — validar com Henrique).
// Múltiplas páginas de um mesmo vestido = diferentes cores/estampas disponíveis,
// mas os nomes das cores precisam ser confirmados.
// ─────────────────────────────────────────────────────────────────────────────

const measurementsVestido = (comprimento: number) => ({
  P: `Busto 86cm · Cintura 66cm · Comprimento ${comprimento}cm`,
  M: `Busto 90cm · Cintura 70cm · Comprimento ${comprimento + 1}cm`,
  G: `Busto 96cm · Cintura 76cm · Comprimento ${comprimento + 2}cm`,
});

const vestidoVariants = (
  productId: number,
  baseVariantId: number,
  skuBase: string,
  stocks: [number, number, number],
): ProductVariant[] => [
  { id: uuid(baseVariantId), product_id: uuid(productId), sku: `${skuBase}-P`, size: "P", color: null, stock_quantity: stocks[0], created_at: daysAgo(14) },
  { id: uuid(baseVariantId + 1), product_id: uuid(productId), sku: `${skuBase}-M`, size: "M", color: null, stock_quantity: stocks[1], created_at: daysAgo(14) },
  { id: uuid(baseVariantId + 2), product_id: uuid(productId), sku: `${skuBase}-G`, size: "G", color: null, stock_quantity: stocks[2], created_at: daysAgo(14) },
];

const VESTIDOS: Product[] = [
  // ── Vestido Havana ────────────────────────────────────────────────────────
  {
    id: uuid(201),
    name: "Vestido Havana",
    slug: "vestido-havana",
    description:
      "Vestido midi em algodão com bordado artesanal e estampas exclusivas inspiradas na vibrante cultura caribenha. Caimento fluido e versátil, perfeito para o dia a dia ou ocasiões especiais. Disponível em três estampas distintas.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 549,
    wholesale_price: 329,
    is_active: true,
    images: [
      img("produto_pagina_45_vestido_havana_0.jpeg"),
      img("produto_pagina_46_vestido_havana_0.jpeg"),
      img("produto_pagina_47_vestido_havana_0.jpeg"),
    ],
    weight_grams: 320,
    length_cm: 35,
    width_cm: 5,
    height_cm: 30,
    measurements: measurementsVestido(108),
    ncm: null,
    cfop: null,
    created_at: daysAgo(20),
    variants: vestidoVariants(201, 2001, "VES-HAVA", [3, 5, 2]),
  },

  // ── Vestido Dani ──────────────────────────────────────────────────────────
  {
    id: uuid(202),
    name: "Vestido Dani",
    slug: "vestido-dani",
    description:
      "Vestido leve e despojado com bordado floral delicado. Silhueta feminina e moderna, ideal para o verão. Tecido suave que acompanha cada movimento com leveza e elegância.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 419,
    wholesale_price: 251,
    is_active: true,
    images: [
      img("produto_pagina_48_vestido_dani_0.jpeg"),
      img("produto_pagina_49_vestido_dani_0.jpeg"),
      img("produto_pagina_50_vestido_dani_0.jpeg"),
    ],
    weight_grams: 280,
    length_cm: 32,
    width_cm: 5,
    height_cm: 28,
    measurements: measurementsVestido(100),
    ncm: null,
    cfop: null,
    created_at: daysAgo(25),
    variants: vestidoVariants(202, 2011, "VES-DANI", [4, 6, 3]),
  },

  // ── Vestido Fiji ──────────────────────────────────────────────────────────
  {
    id: uuid(203),
    name: "Vestido Fiji",
    slug: "vestido-fiji",
    description:
      "Vestido em linho lavado com bordado artesanal que remete às paisagens tropicais do Pacífico. Silhueta ampla e confortável, perfeito para o calor. Disponível em seis estampas distintas.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 529,
    wholesale_price: 317,
    is_active: true,
    images: [
      img("produto_pagina_57_vestido_fiji_0.jpeg"),
      img("produto_pagina_58_vestido_fiji_0.jpeg"),
      img("produto_pagina_59_vestido_fiji_0.jpeg"),
    ],
    weight_grams: 300,
    length_cm: 34,
    width_cm: 5,
    height_cm: 30,
    measurements: measurementsVestido(105),
    ncm: null,
    cfop: null,
    created_at: daysAgo(18),
    variants: vestidoVariants(203, 2021, "VES-FIJI", [3, 4, 2]),
  },

  // ── Vestido Mônaco ────────────────────────────────────────────────────────
  {
    id: uuid(204),
    name: "Vestido Mônaco",
    slug: "vestido-monaco",
    description:
      "Vestido evasê em algodão com bordado artesanal refinado. Elegante e versátil, combina com sandálias rasteiras na praia ou salto para uma ocasião especial.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 469,
    wholesale_price: 281,
    is_active: false,
    images: [
      img("produto_pagina_63_vestido_mônaco_0.jpeg"),
      img("produto_pagina_64_vestido_mônaco_0.jpeg"),
    ],
    weight_grams: 290,
    length_cm: 33,
    width_cm: 5,
    height_cm: 28,
    measurements: measurementsVestido(102),
    ncm: null,
    cfop: null,
    created_at: daysAgo(22),
    variants: vestidoVariants(204, 2031, "VES-MONA", [3, 5, 2]),
  },

  // ── Vestido Verona ────────────────────────────────────────────────────────
  {
    id: uuid(205),
    name: "Vestido Verona",
    slug: "vestido-verona",
    description:
      "Vestido midi em linho natural com bordado geométrico exclusivo. Corte estruturado que valoriza a silhueta com sofisticação e autenticidade artesanal.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 479,
    wholesale_price: 287,
    is_active: true,
    images: [
      img("produto_pagina_65_vestido_verona_0.jpeg"),
      img("produto_pagina_65_vestido_verona_1.jpeg"),
    ],
    weight_grams: 310,
    length_cm: 35,
    width_cm: 5,
    height_cm: 30,
    measurements: measurementsVestido(110),
    ncm: null,
    cfop: null,
    created_at: daysAgo(30),
    variants: vestidoVariants(205, 2041, "VES-VERO", [2, 4, 3]),
  },

  // ── Vestido Maia ──────────────────────────────────────────────────────────
  {
    id: uuid(206),
    name: "Vestido Maia",
    slug: "vestido-maia",
    description:
      "Vestido curto e alegre com bordado artesanal inspirado na exuberância da natureza brasileira. Leveza e frescor para o dia a dia, perfeito para o verão.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 389,
    wholesale_price: 233,
    is_active: true,
    images: [
      img("produto_pagina_66_vestido_maia_0.jpeg"),
      img("produto_pagina_67_vestido_maia_0.jpeg"),
    ],
    weight_grams: 260,
    length_cm: 30,
    width_cm: 5,
    height_cm: 25,
    measurements: measurementsVestido(92),
    ncm: null,
    cfop: null,
    created_at: daysAgo(15),
    variants: vestidoVariants(206, 2051, "VES-MAIA", [4, 7, 3]),
  },

  // ── Vestido Viena ─────────────────────────────────────────────────────────
  {
    id: uuid(207),
    name: "Vestido Viena",
    slug: "vestido-viena",
    description:
      "Vestido longo em algodão com rendas artesanais e bordado delicado. Elegância clássica com toque contemporâneo. Perfeito para eventos ao ar livre e celebrações.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 479,
    wholesale_price: 287,
    is_active: true,
    images: [
      img("produto_pagina_68_vestido_viena_0.jpeg"),
      img("produto_pagina_69_vestido_viena_0.jpeg"),
      img("produto_pagina_70_vestido_viena_0.jpeg"),
    ],
    weight_grams: 380,
    length_cm: 40,
    width_cm: 5,
    height_cm: 36,
    measurements: measurementsVestido(138),
    ncm: null,
    cfop: null,
    created_at: daysAgo(28),
    variants: vestidoVariants(207, 2061, "VES-VIEN", [3, 5, 2]),
  },

  // ── Vestido Cancún ────────────────────────────────────────────────────────
  {
    id: uuid(208),
    name: "Vestido Cancún",
    slug: "vestido-cancun",
    description:
      "Vestido de praia em tecido levíssimo com bordado colorido e alegre. Espírito tropical e descontraído, ideal para passeios à beira-mar e tardes ensolaradas.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 489,
    wholesale_price: 293,
    is_active: false,
    images: [
      img("produto_pagina_72_vestido_cancún_0.jpeg"),
      img("produto_pagina_73_vestido_cancún_0.jpeg"),
      img("produto_pagina_74_vestido_cancún_0.jpeg"),
    ],
    weight_grams: 270,
    length_cm: 32,
    width_cm: 5,
    height_cm: 28,
    measurements: measurementsVestido(106),
    ncm: null,
    cfop: null,
    created_at: daysAgo(12),
    variants: vestidoVariants(208, 2071, "VES-CANC", [3, 6, 2]),
  },

  // ── Vestido Inca ──────────────────────────────────────────────────────────
  {
    id: uuid(209),
    name: "Vestido Inca",
    slug: "vestido-inca",
    description:
      "Vestido midi com bordado geométrico inspirado na rica arte pré-colombiana. Cores terrosas e formas simbólicas que contam histórias. Uma peça autêntica e cultural.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 399,
    wholesale_price: 239,
    is_active: true,
    images: [
      img("produto_pagina_75_vestido_inca_0.jpeg"),
      img("produto_pagina_76_vestido_inca_0.jpeg"),
    ],
    weight_grams: 300,
    length_cm: 34,
    width_cm: 5,
    height_cm: 30,
    measurements: measurementsVestido(108),
    ncm: null,
    cfop: null,
    created_at: daysAgo(35),
    variants: vestidoVariants(209, 2081, "VES-INCA", [2, 4, 3]),
  },

  // ── Vestido Bali ──────────────────────────────────────────────────────────
  {
    id: uuid(210),
    name: "Vestido Bali",
    slug: "vestido-bali",
    description:
      "Vestido inspirado nas estampas e bordados da ilha de Bali. Tecido leve com detalhes manuais que capturam a essência do artesanato balinês. Livre, feminino e cheio de personalidade.",
    category: "roupas",
    subcategory: "vestidos",
    base_price: 499,
    wholesale_price: 299,
    is_active: true,
    images: [
      img("produto_pagina_77_vestido_bali_0.jpeg"),
      img("produto_pagina_78_vestido_bali_0.jpeg"),
    ],
    weight_grams: 310,
    length_cm: 34,
    width_cm: 5,
    height_cm: 30,
    measurements: measurementsVestido(106),
    ncm: null,
    cfop: null,
    created_at: daysAgo(8),
    variants: vestidoVariants(210, 2091, "VES-BALI", [3, 5, 2]),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUTOS — BATAS
// Batas são tamanho único. Múltiplas páginas = diferentes cores/variantes.
// Os nomes das variantes estão como "Variante 1/2/3" — validar com Henrique.
// ─────────────────────────────────────────────────────────────────────────────

const measurementsBata = (comprimento: number) => ({
  Único: `Busto até 106cm · Comprimento ${comprimento}cm`,
});

type BataVariantInput = { id: number; sku: string; imgFile: string; stock: number };

const bataVariants = (
  productId: number,
  inputs: BataVariantInput[],
): ProductVariant[] =>
  inputs.map((v, i) => ({
    id: uuid(v.id),
    product_id: uuid(productId),
    sku: v.sku,
    size: "Único",
    color: `Variante ${i + 1}`,
    stock_quantity: v.stock,
    created_at: daysAgo(14),
  }));

const BATAS: Product[] = [
  // ── Bata Asteca ───────────────────────────────────────────────────────────
  {
    id: uuid(301),
    name: "Bata Asteca",
    slug: "bata-asteca",
    description:
      "Bata ampla em linho natural com bordado geométrico inspirado na arte asteca. Corte reto e tamanho único generoso. Cada peça carrega a riqueza de uma cultura milenar.",
    category: "roupas",
    subcategory: "batas",
    base_price: 279,
    wholesale_price: 167,
    is_active: true,
    images: [
      img("produto_pagina_79_bata_asteca_0.jpeg"),
      img("produto_pagina_80_bata_asteca_0.jpeg"),
    ],
    weight_grams: 260,
    length_cm: 32,
    width_cm: 4,
    height_cm: 26,
    measurements: measurementsBata(72),
    ncm: null,
    cfop: null,
    created_at: daysAgo(30),
    variants: bataVariants(301, [
      { id: 3001, sku: "BAT-ASTE-V1-UNICO", imgFile: "produto_pagina_79_bata_asteca_0.jpeg", stock: 5 },
      { id: 3002, sku: "BAT-ASTE-V2-UNICO", imgFile: "produto_pagina_80_bata_asteca_0.jpeg", stock: 4 },
    ]),
  },

  // ── Bata Yoko ─────────────────────────────────────────────────────────────
  {
    id: uuid(302),
    name: "Bata Yoko",
    slug: "bata-yoko",
    description:
      "Bata em algodão com bordado artesanal de motivos orientais. Corte reto e fluido que traz conforto e estilo ao mesmo tempo. Versátil para diferentes ocasiões.",
    category: "roupas",
    subcategory: "batas",
    base_price: 369,
    wholesale_price: 221,
    is_active: true,
    images: [
      img("produto_pagina_81_bata_yoko_0.jpeg"),
      img("produto_pagina_82_bata_yoko_0.jpeg"),
    ],
    weight_grams: 280,
    length_cm: 33,
    width_cm: 4,
    height_cm: 28,
    measurements: measurementsBata(74),
    ncm: null,
    cfop: null,
    created_at: daysAgo(22),
    variants: bataVariants(302, [
      { id: 3011, sku: "BAT-YOKO-V1-UNICO", imgFile: "produto_pagina_81_bata_yoko_0.jpeg", stock: 4 },
      { id: 3012, sku: "BAT-YOKO-V2-UNICO", imgFile: "produto_pagina_82_bata_yoko_0.jpeg", stock: 3 },
    ]),
  },

  // ── Bata Maia ─────────────────────────────────────────────────────────────
  {
    id: uuid(303),
    name: "Bata Maia",
    slug: "bata-maia",
    description:
      "Bata em voile de algodão com bordado floral manual delicado. Levíssima e translúcida, ideal para o calor. Cada bordado é único, feito à mão com carinho.",
    category: "roupas",
    subcategory: "batas",
    base_price: 289,
    wholesale_price: 173,
    is_active: true,
    images: [
      img("produto_pagina_83_bata_maia_0.jpeg"),
      img("produto_pagina_84_bata_maia_0.jpeg"),
      img("produto_pagina_85_bata_maia_0.png"),
    ],
    weight_grams: 200,
    length_cm: 30,
    width_cm: 3,
    height_cm: 24,
    measurements: measurementsBata(70),
    ncm: null,
    cfop: null,
    created_at: daysAgo(18),
    variants: bataVariants(303, [
      { id: 3021, sku: "BAT-MAIB-V1-UNICO", imgFile: "produto_pagina_83_bata_maia_0.jpeg", stock: 6 },
      { id: 3022, sku: "BAT-MAIB-V2-UNICO", imgFile: "produto_pagina_84_bata_maia_0.jpeg", stock: 4 },
      { id: 3023, sku: "BAT-MAIB-V3-UNICO", imgFile: "produto_pagina_85_bata_maia_0.png", stock: 3 },
    ]),
  },

  // ── Bata Heló ─────────────────────────────────────────────────────────────
  {
    id: uuid(304),
    name: "Bata Heló",
    slug: "bata-helo",
    description:
      "Bata em linho lavado com acabamento em crochê artesanal nas bordas. Elegância natural que combina tradição e modernidade. Perfeita como saída de praia ou look casual.",
    category: "roupas",
    subcategory: "batas",
    base_price: 359,
    wholesale_price: 215,
    is_active: false,
    images: [
      img("produto_pagina_89_bata_helô_0.jpeg"),
      img("produto_pagina_90_bata_helô_0.jpeg"),
      img("produto_pagina_91_bata_helô_0.jpeg"),
    ],
    weight_grams: 240,
    length_cm: 31,
    width_cm: 4,
    height_cm: 26,
    measurements: measurementsBata(72),
    ncm: null,
    cfop: null,
    created_at: daysAgo(14),
    variants: bataVariants(304, [
      { id: 3031, sku: "BAT-HELO-V1-UNICO", imgFile: "produto_pagina_89_bata_helô_0.jpeg", stock: 4 },
      { id: 3032, sku: "BAT-HELO-V2-UNICO", imgFile: "produto_pagina_90_bata_helô_0.jpeg", stock: 3 },
      { id: 3033, sku: "BAT-HELO-V3-UNICO", imgFile: "produto_pagina_91_bata_helô_0.jpeg", stock: 2 },
    ]),
  },

  // ── Bata Inca ─────────────────────────────────────────────────────────────
  {
    id: uuid(305),
    name: "Bata Inca",
    slug: "bata-inca",
    description:
      "Bata com bordado geométrico em cores terrosas, inspirado na arte pré-colombiana. Peça de identidade cultural forte, feita para mulheres que valorizam história e autenticidade.",
    category: "roupas",
    subcategory: "batas",
    base_price: 289,
    wholesale_price: 173,
    is_active: true,
    images: [
      img("produto_pagina_92_bata_inca_0.jpeg"),
      img("produto_pagina_93_bata_inca_0.jpeg"),
    ],
    weight_grams: 260,
    length_cm: 32,
    width_cm: 4,
    height_cm: 26,
    measurements: measurementsBata(72),
    ncm: null,
    cfop: null,
    created_at: daysAgo(35),
    variants: bataVariants(305, [
      { id: 3041, sku: "BAT-INCC-V1-UNICO", imgFile: "produto_pagina_92_bata_inca_0.jpeg", stock: 5 },
      { id: 3042, sku: "BAT-INCC-V2-UNICO", imgFile: "produto_pagina_93_bata_inca_0.jpeg", stock: 4 },
    ]),
  },

  // ── Bata Malu ─────────────────────────────────────────────────────────────
  {
    id: uuid(306),
    name: "Bata Malu",
    slug: "bata-malu",
    description:
      "Bata em algodão cru com aplicações bordadas em ponto cheio. Design atemporal que nunca sai de moda. Versátil e confortável para o dia a dia.",
    category: "roupas",
    subcategory: "batas",
    base_price: 279,
    wholesale_price: 167,
    is_active: true,
    images: [
      img("produto_pagina_94_bata_malu_0.jpeg"),
      img("produto_pagina_95_bata_malu_0.jpeg"),
    ],
    weight_grams: 250,
    length_cm: 31,
    width_cm: 4,
    height_cm: 25,
    measurements: measurementsBata(70),
    ncm: null,
    cfop: null,
    created_at: daysAgo(40),
    variants: bataVariants(306, [
      { id: 3051, sku: "BAT-MALU-V1-UNICO", imgFile: "produto_pagina_94_bata_malu_0.jpeg", stock: 6 },
      { id: 3052, sku: "BAT-MALU-V2-UNICO", imgFile: "produto_pagina_95_bata_malu_0.jpeg", stock: 5 },
    ]),
  },

  // ── Bata Jú ───────────────────────────────────────────────────────────────
  {
    id: uuid(307),
    name: "Bata Jú",
    slug: "bata-ju",
    description:
      "Bata em linho com bordado botânico delicado. Frescor e leveza em uma peça que funciona tanto como saída de praia quanto em look casual urbano.",
    category: "roupas",
    subcategory: "batas",
    base_price: 289,
    wholesale_price: 173,
    is_active: false,
    images: [
      img("produto_pagina_96_bata_jú_0.jpeg"),
      img("produto_pagina_97_bata_jú_0.jpeg"),
    ],
    weight_grams: 220,
    length_cm: 30,
    width_cm: 4,
    height_cm: 24,
    measurements: measurementsBata(70),
    ncm: null,
    cfop: null,
    created_at: daysAgo(25),
    variants: bataVariants(307, [
      { id: 3061, sku: "BAT-JU-V1-UNICO", imgFile: "produto_pagina_96_bata_jú_0.jpeg", stock: 5 },
      { id: 3062, sku: "BAT-JU-V2-UNICO", imgFile: "produto_pagina_97_bata_jú_0.jpeg", stock: 3 },
    ]),
  },

  // ── Bata Sino ─────────────────────────────────────────────────────────────
  {
    id: uuid(308),
    name: "Bata Sino",
    slug: "bata-sino",
    description:
      "Bata com manga sino em algodão leve e bordado artesanal nas mangas. Elegante e feminina, ideal para valorizar o movimento dos braços. Uma peça especial para ocasiões que merecem destaque.",
    category: "roupas",
    subcategory: "batas",
    base_price: 339,
    wholesale_price: 203,
    is_active: true,
    images: [
      img("produto_pagina_98_bata_sino_0.jpeg"),
      img("produto_pagina_98_bata_sino_1.jpeg"),
    ],
    weight_grams: 240,
    length_cm: 32,
    width_cm: 4,
    height_cm: 26,
    measurements: measurementsBata(72),
    ncm: null,
    cfop: null,
    created_at: daysAgo(10),
    variants: [
      { id: uuid(3071), product_id: uuid(308), sku: "BAT-SINO-NAT-UNICO", size: "Único", color: "Natural", stock_quantity: 4, created_at: daysAgo(10) },
    ],
  },

  // ── Bata Bia ──────────────────────────────────────────────────────────────
  {
    id: uuid(309),
    name: "Bata Bia",
    slug: "bata-bia",
    description:
      "Bata em algodão artesanal com bordado colorido e alegre. Um toque de alegria e autenticidade para o look do dia. Leve, confortável e com personalidade marcante.",
    category: "roupas",
    subcategory: "batas",
    base_price: 329,
    wholesale_price: 197,
    is_active: true,
    images: [
      img("produto_pagina_99_bata_bia_0.jpeg"),
      img("produto_pagina_100_bata_bia_0.jpeg"),
    ],
    weight_grams: 250,
    length_cm: 31,
    width_cm: 4,
    height_cm: 26,
    measurements: measurementsBata(72),
    ncm: null,
    cfop: null,
    created_at: daysAgo(6),
    variants: bataVariants(309, [
      { id: 3081, sku: "BAT-BIA-V1-UNICO", imgFile: "produto_pagina_99_bata_bia_0.jpeg", stock: 4 },
      { id: 3082, sku: "BAT-BIA-V2-UNICO", imgFile: "produto_pagina_100_bata_bia_0.jpeg", stock: 3 },
    ]),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUTOS — BAZAR
// Peças de coleções anteriores ou amostras com preço especial.
// Imagens das páginas 86-88 do catálogo (peças sem nome identificado).
// ─────────────────────────────────────────────────────────────────────────────

const BAZAR: Product[] = [
  {
    id: uuid(350),
    name: "Bata Especial I",
    slug: "bazar-bata-especial-i",
    description:
      "Peça de coleção anterior com bordado artesanal exclusivo. Oportunidade única de adquirir uma peça Patrícia Carreira com preço especial. Quantidade limitada.",
    category: "bazar",
    subcategory: null,
    base_price: 189,
    wholesale_price: null,
    is_active: true,
    images: [
      img("produto_pagina_86__0.jpeg"),
      img("produto_pagina_86__1.png"),
    ],
    weight_grams: 240,
    length_cm: 32,
    width_cm: 4,
    height_cm: 26,
    measurements: { Único: "Busto até 106cm · Comprimento 72cm" },
    ncm: null,
    cfop: null,
    created_at: daysAgo(5),
    variants: [
      { id: uuid(3500), product_id: uuid(350), sku: "BAZ-BATA1-UNICO", size: "Único", color: "Natural", stock_quantity: 2, created_at: daysAgo(5) },
    ],
  },
  {
    id: uuid(351),
    name: "Bata Especial II",
    slug: "bazar-bata-especial-ii",
    description:
      "Bata artesanal de coleção anterior com bordado manual. Peça única com desconto especial — quando acabar, não repõe.",
    category: "bazar",
    subcategory: null,
    base_price: 169,
    wholesale_price: null,
    is_active: true,
    images: [
      img("produto_pagina_87__0.png"),
      img("produto_pagina_87__1.jpeg"),
    ],
    weight_grams: 220,
    length_cm: 30,
    width_cm: 4,
    height_cm: 24,
    measurements: { Único: "Busto até 106cm · Comprimento 70cm" },
    ncm: null,
    cfop: null,
    created_at: daysAgo(5),
    variants: [
      { id: uuid(3501), product_id: uuid(351), sku: "BAZ-BATA2-UNICO", size: "Único", color: "Natural", stock_quantity: 1, created_at: daysAgo(5) },
    ],
  },
  {
    id: uuid(352),
    name: "Bata Especial III",
    slug: "bazar-bata-especial-iii",
    description:
      "Bata artesanal de edição limitada com bordado exclusivo. Peça do bazar com preço especial — quantidade limitadíssima.",
    category: "bazar",
    subcategory: null,
    base_price: 179,
    wholesale_price: null,
    is_active: true,
    images: [
      img("produto_pagina_88__0.jpeg"),
      img("produto_pagina_88__1.jpeg"),
    ],
    weight_grams: 230,
    length_cm: 31,
    width_cm: 4,
    height_cm: 25,
    measurements: { Único: "Busto até 106cm · Comprimento 70cm" },
    ncm: null,
    cfop: null,
    created_at: daysAgo(5),
    variants: [
      { id: uuid(3502), product_id: uuid(352), sku: "BAZ-BATA3-UNICO", size: "Único", color: "Natural", stock_quantity: 1, created_at: daysAgo(5) },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TODOS OS PRODUTOS
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: Product[] = [...BOLSAS, ...VESTIDOS, ...BATAS, ...BAZAR];

// ─────────────────────────────────────────────────────────────────────────────
// MATÉRIAS-PRIMAS
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_RAW_MATERIALS: RawMaterial[] = [
  {
    id: uuid(401),
    name: "Lona de Algodão Natural",
    unit: "metro",
    stock_quantity: 32.5,
    minimum_stock: 10,
    cost_per_unit: 38,
    supplier: "Tecidos Brasileiros Ltda",
    updated_at: daysAgo(3),
  },
  {
    id: uuid(402),
    name: "Couro Legítimo",
    unit: "metro",
    stock_quantity: 8.0,
    minimum_stock: 4,
    cost_per_unit: 145,
    supplier: "Couros & Afins",
    updated_at: daysAgo(5),
  },
  {
    id: uuid(403),
    name: "Linha de Bordado — Multicor",
    unit: "unidade",
    stock_quantity: 48,
    minimum_stock: 20,
    cost_per_unit: 4.5,
    supplier: "Armarinho Popular",
    updated_at: daysAgo(10),
  },
  {
    id: uuid(404),
    name: "Linho Natural",
    unit: "metro",
    stock_quantity: 14.0,
    minimum_stock: 6,
    cost_per_unit: 52,
    supplier: "Tecidos Brasileiros Ltda",
    updated_at: daysAgo(7),
  },
  {
    id: uuid(405),
    name: "Algodão Cru",
    unit: "metro",
    stock_quantity: 22.0,
    minimum_stock: 8,
    cost_per_unit: 28,
    supplier: "Cotonifício Santa Maria",
    updated_at: daysAgo(12),
  },
  {
    id: uuid(406),
    name: "Fecho Magnético Dourado",
    unit: "unidade",
    stock_quantity: 30,
    minimum_stock: 10,
    cost_per_unit: 6,
    supplier: "Armarinho Popular",
    updated_at: daysAgo(10),
  },
  {
    id: uuid(407),
    name: "Zíper Metal nº5",
    unit: "unidade",
    stock_quantity: 8,
    minimum_stock: 15,
    cost_per_unit: 3.5,
    supplier: "Armarinho Popular",
    updated_at: daysAgo(20),
  }, // ⚠️ abaixo do mínimo
  {
    id: uuid(408),
    name: "Mosquetão Interno",
    unit: "unidade",
    stock_quantity: 60,
    minimum_stock: 20,
    cost_per_unit: 2.5,
    supplier: "Armarinho Popular",
    updated_at: daysAgo(8),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: uuid(501),
    user_id: uuid(2),
    type: "retail",
    name: "Ana Paula Ferreira",
    email: "anapaula@email.com",
    phone: "(22) 99812-3456",
    cpf_cnpj: "123.456.789-00",
    address: {
      street: "Rua das Pedras",
      number: "42",
      complement: null,
      neighborhood: "Centro",
      city: "Búzios",
      state: "RJ",
      zip: "28950-000",
    },
    created_at: daysAgo(45),
  },
  {
    id: uuid(502),
    user_id: null,
    type: "retail",
    name: "Mariana Costa",
    email: "mariana.costa@gmail.com",
    phone: "(21) 98765-4321",
    cpf_cnpj: "234.567.890-11",
    address: {
      street: "Rua Visconde de Pirajá",
      number: "550",
      complement: "Apto 301",
      neighborhood: "Ipanema",
      city: "Rio de Janeiro",
      state: "RJ",
      zip: "22410-002",
    },
    created_at: daysAgo(30),
  },
  {
    id: uuid(503),
    user_id: null,
    type: "wholesale",
    name: "Boutique Arraial — Fernanda Luz",
    email: "fernanda@boutiquearraial.com.br",
    phone: "(22) 3622-9988",
    cpf_cnpj: "12.345.678/0001-99",
    address: {
      street: "Rua da Praia Grande",
      number: "88",
      complement: null,
      neighborhood: "Praia Grande",
      city: "Arraial do Cabo",
      state: "RJ",
      zip: "28930-000",
    },
    created_at: daysAgo(90),
  },
  {
    id: uuid(504),
    user_id: null,
    type: "wholesale",
    name: "Loja Raízes Mineiras — Cláudia",
    email: "claudi@raizesmineiras.com.br",
    phone: "(31) 3333-7777",
    cpf_cnpj: "98.765.432/0001-55",
    address: {
      street: "Rua Direita",
      number: "12",
      complement: "Loja 2",
      neighborhood: "Centro Histórico",
      city: "Ouro Preto",
      state: "MG",
      zip: "35400-000",
    },
    created_at: daysAgo(60),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CUPONS DE DESCONTO
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_COUPONS: Coupon[] = [
  {
    id: uuid(701),
    code: "BEMVINDO50",
    type: "percent",
    value: 50,
    min_order_value: 0,
    max_uses: null,
    max_uses_per_user: 1,
    uses_count: 12,
    valid_from: daysAgo(60),
    valid_until: null,
    is_active: true,
    description: "Cupom de boas-vindas — 50% off (banner cadastro)",
    created_at: daysAgo(60),
  },
  {
    id: uuid(702),
    code: "VERAO2026",
    type: "fixed",
    value: 100,
    min_order_value: 500,
    max_uses: 50,
    max_uses_per_user: null,
    uses_count: 8,
    valid_from: daysAgo(10),
    valid_until: new Date(Date.now() + 30 * 864e5).toISOString(),
    is_active: true,
    description: "Campanha verão — R$100 off em compras acima de R$500",
    created_at: daysAgo(10),
  },
  {
    id: uuid(703),
    code: "INSTAGRAM10",
    type: "percent",
    value: 10,
    min_order_value: 0,
    max_uses: null,
    max_uses_per_user: null,
    uses_count: 34,
    valid_from: daysAgo(90),
    valid_until: null,
    is_active: true,
    description: "Desconto exclusivo para seguidores do Instagram",
    created_at: daysAgo(90),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PARCEIROS / AFILIADOS
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_PARTNERS: Partner[] = [
  {
    id: uuid(801),
    name: "Juliana Moda Carioca",
    type: "affiliate",
    contact_name: "Juliana Soares",
    email: "ju@modacarioca.com.br",
    phone: "(21) 97777-1234",
    commission_pct: 10,
    payment_day: 10,
    notes: "Influenciadora com 45k no Instagram. Paga no dia 10 de cada mês via PIX.",
    is_active: true,
    created_at: daysAgo(45),
  },
  {
    id: uuid(802),
    name: "Empório Arraial",
    type: "wholesale_partner",
    contact_name: "Roberto Campos",
    email: "contato@emporioarraial.com.br",
    phone: "(22) 3622-4455",
    commission_pct: null,
    payment_day: 15,
    notes: "Loja física em Arraial do Cabo. Pedido mínimo a combinar. Paga dia 15.",
    is_active: true,
    created_at: daysAgo(120),
  },
];

export const MOCK_PARTNER_TASKS: PartnerTask[] = [
  {
    id: uuid(901),
    partner_id: uuid(801),
    title: "Enviar kit de amostras — coleção inverno",
    due_date: new Date(Date.now() + 5 * 864e5).toISOString().split("T")[0],
    is_done: false,
    created_at: daysAgo(2),
  },
  {
    id: uuid(902),
    partner_id: uuid(801),
    title: "Confirmar pagamento de comissão — abril",
    due_date: new Date(Date.now() + 3 * 864e5).toISOString().split("T")[0],
    is_done: false,
    created_at: daysAgo(1),
  },
  {
    id: uuid(903),
    partner_id: uuid(802),
    title: "Ligar para alinhar pedido do mês",
    due_date: new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0],
    is_done: false,
    created_at: daysAgo(3),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_ORDERS: Order[] = [
  {
    id: uuid(601),
    customer_id: uuid(501),
    type: "retail",
    status: "paid",
    total_amount: 479,
    discount_amount: 0,
    shipping_amount: 28.9,
    payment_status: "paid",
    payment_id: "mp_pay_abc123",
    payment_method: "pix",
    shipping_method: "PAC",
    tracking_code: null,
    coupon_id: null,
    nfe_number: "000042",
    nfe_url: null,
    nfe_status: "pending" as NfeStatus,
    nfe_access_key: null,
    notes: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
    customer: MOCK_CUSTOMERS[0],
    items: [
      {
        id: uuid(6001),
        order_id: uuid(601),
        product_variant_id: uuid(1004),
        quantity: 1,
        unit_price: 479,
        created_at: daysAgo(2),
      },
    ],
  },
  {
    id: uuid(602),
    customer_id: uuid(502),
    type: "retail",
    status: "pending",
    total_amount: 1028,
    discount_amount: 100,
    shipping_amount: 0,
    payment_status: "pending",
    payment_id: null,
    payment_method: null,
    shipping_method: null,
    tracking_code: null,
    coupon_id: uuid(702),
    nfe_number: null,
    nfe_url: null,
    nfe_status: "pending" as NfeStatus,
    nfe_access_key: null,
    notes: "Cupom VERAO2026 aplicado.",
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    customer: MOCK_CUSTOMERS[1],
    items: [
      {
        id: uuid(6002),
        order_id: uuid(602),
        product_variant_id: uuid(1044),
        quantity: 1,
        unit_price: 629,
        created_at: daysAgo(1),
      },
      {
        id: uuid(6003),
        order_id: uuid(602),
        product_variant_id: uuid(2051),
        quantity: 1,
        unit_price: 389,
        created_at: daysAgo(1),
      },
    ],
  },
  {
    id: uuid(603),
    customer_id: uuid(503),
    type: "wholesale",
    status: "in_production",
    total_amount: 4734,
    discount_amount: 0,
    shipping_amount: 0,
    payment_status: "paid",
    payment_id: "transf_bco_789",
    payment_method: "pix",
    shipping_method: null,
    tracking_code: null,
    coupon_id: null,
    nfe_number: null,
    nfe_url: null,
    nfe_status: "pending" as NfeStatus,
    nfe_access_key: null,
    notes: "Boutique Arraial — pedido de reposição. Prazo: 15 dias.",
    created_at: daysAgo(10),
    updated_at: daysAgo(8),
    customer: MOCK_CUSTOMERS[2],
    items: [
      {
        id: uuid(6004),
        order_id: uuid(603),
        product_variant_id: uuid(1014),
        quantity: 5,
        unit_price: 359,
        created_at: daysAgo(10),
      },
      {
        id: uuid(6005),
        order_id: uuid(603),
        product_variant_id: uuid(1042),
        quantity: 5,
        unit_price: 377,
        created_at: daysAgo(10),
      },
    ],
  },
  {
    id: uuid(604),
    customer_id: uuid(504),
    type: "wholesale",
    status: "confirmed",
    total_amount: 3192,
    discount_amount: 0,
    shipping_amount: 0,
    payment_status: "pending",
    payment_id: null,
    payment_method: null,
    shipping_method: null,
    tracking_code: null,
    coupon_id: null,
    nfe_number: null,
    nfe_url: null,
    nfe_status: "pending" as NfeStatus,
    nfe_access_key: null,
    notes: "Raízes Mineiras — 50% entrada, 50% na entrega.",
    created_at: daysAgo(4),
    updated_at: daysAgo(3),
    customer: MOCK_CUSTOMERS[3],
    items: [
      {
        id: uuid(6006),
        order_id: uuid(604),
        product_variant_id: uuid(2001),
        quantity: 4,
        unit_price: 329,
        created_at: daysAgo(4),
      },
      {
        id: uuid(6007),
        order_id: uuid(604),
        product_variant_id: uuid(3021),
        quantity: 6,
        unit_price: 173,
        created_at: daysAgo(4),
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ALERTAS DE ESTOQUE
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_STOCK_ALERTS: StockAlert[] = [
  {
    type: "raw_material",
    id: uuid(407),
    name: "Zíper Metal nº5",
    current_stock: 8,
    minimum_stock: 15,
    unit: "unidade",
  },
  {
    type: "product_variant",
    id: uuid(1021),
    name: "Bolsa Liberty — Único",
    current_stock: 3,
    minimum_stock: 5,
    unit: "unidade",
  },
  {
    type: "product_variant",
    id: uuid(3033),
    name: "Bata Heló — Variante 3",
    current_stock: 2,
    minimum_stock: 3,
    unit: "unidade",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  orders_today: 2,
  orders_pending: 3,
  revenue_month: 24860,
  low_stock_alerts: MOCK_STOCK_ALERTS.length,
  production_orders_active: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES UTILITÁRIAS DE QUERY
// ─────────────────────────────────────────────────────────────────────────────

export function getProductBySlug(slug: string): Product | null {
  return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function getProductsByCategory(
  category:
    | "bolsas"
    | "vestidos"
    | "batas"
    | "acessorios"
    | "bazar"
    | "vestuario"
    | "lancamentos"
    | "infantil"
    | "almofadas",
  onlyActive = true,
): Product[] {
  if (category === "vestuario") {
    return MOCK_PRODUCTS.filter(
      (p) => (!onlyActive || p.is_active) && p.category === "roupas",
    );
  }

  if (category === "lancamentos") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
    const recent = MOCK_PRODUCTS.filter(
      (p) =>
        (!onlyActive || p.is_active) &&
        p.category !== "bazar" &&
        new Date(p.created_at) > thirtyDaysAgo,
    );
    return recent.length > 0
      ? recent
      : MOCK_PRODUCTS.filter(
          (p) => (!onlyActive || p.is_active) && p.category !== "bazar",
        ).slice(0, 8);
  }

  if (category === "infantil" || category === "almofadas") {
    return [];
  }

  const filter: Partial<
    Record<string, { category: string; subcategory: string | null }>
  > = {
    bolsas: { category: "bolsas", subcategory: null },
    vestidos: { category: "roupas", subcategory: "vestidos" },
    batas: { category: "roupas", subcategory: "batas" },
    acessorios: { category: "acessorios", subcategory: null },
    bazar: { category: "bazar", subcategory: null },
  };
  const f = filter[category];
  if (!f) return [];
  return MOCK_PRODUCTS.filter((p) => {
    if (onlyActive && !p.is_active) return false;
    if (p.category !== f.category) return false;
    if (f.subcategory !== null && p.subcategory !== f.subcategory) return false;
    return true;
  });
}

export function getProductBadge(product: Product): string | null {
  const totalStock = (product.variants ?? []).reduce(
    (sum, v) => sum + v.stock_quantity,
    0,
  );
  if (totalStock === 0) return "Esgotado";
  if (totalStock === 1) return "Última Peça";
  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);
  if (new Date(product.created_at) > sevenDaysAgo) return "Lançamento";
  return null;
}

export function isVariantAvailable(variantId: string, quantity = 1): boolean {
  const variant = MOCK_PRODUCTS.flatMap((p) => p.variants ?? []).find(
    (v) => v.id === variantId,
  );
  return !!variant && variant.stock_quantity >= quantity;
}

export function validateCoupon(
  code: string,
  orderSubtotal: number,
): { valid: boolean; coupon?: Coupon; error?: string } {
  const coupon = MOCK_COUPONS.find(
    (c) => c.code.toUpperCase() === code.toUpperCase(),
  );
  if (!coupon) return { valid: false, error: "Cupom não encontrado." };
  if (!coupon.is_active) return { valid: false, error: "Cupom inativo." };
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date())
    return { valid: false, error: "Cupom expirado." };
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses)
    return { valid: false, error: "Cupom esgotado." };
  if (orderSubtotal < coupon.min_order_value)
    return {
      valid: false,
      error: `Pedido mínimo de R$${coupon.min_order_value.toFixed(2)} para este cupom.`,
    };
  return { valid: true, coupon };
}

export function getOrders(
  filters: { type?: "retail" | "wholesale"; status?: string } = {},
): Order[] {
  return MOCK_ORDERS.filter((o) => {
    if (filters.type && o.type !== filters.type) return false;
    if (filters.status && o.status !== filters.status) return false;
    return true;
  });
}
