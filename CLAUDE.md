# CLAUDE.md — Patrícia Carreira: E-commerce + Sistema de Gestão

> Arquivo de contexto para uso com Claude Code. Contém arquitetura, regras de negócio,
> modelagem de dados e decisões técnicas do projeto. Mantenha atualizado a cada mudança
> estrutural relevante.
>
> Última revisão: maio 2026 — alinhado com escopo contratado com Henrique.

---

## 1. Visão Geral do Projeto

**Cliente:** Patrícia Carreira — loja de moda artesanal (bolsas, roupas, acessórios)
**Responsável:** Henrique (dono, único operador do sistema)
**Localização:** Arraial D'Ajuda, BA
**Canais atuais:** Loja física + Instagram (26k seguidores) + vendas via WhatsApp Business

### Problema central

Henrique opera com Excel para estoque e WhatsApp Business com etiquetas para pedidos atacado.
Processo manual, suscetível a erros, não escala. Não há e-commerce.

### Solução

Sistema unificado com dois blocos principais:

1. **E-commerce público** — vitrine + checkout para varejo (B2C), com contas de clientes
2. **Painel administrativo** — gestão de estoque, matéria-prima e ordens de produção

O painel é operado por **uma única pessoa** (Henrique). UX do admin: simples e funcional,
não corporativa. HTML semântico e IDs estáveis — requisito para automação via OpenClaw (Fase 6).

---

## 2. Stack Técnica

| Camada       | Tecnologia               | Status      | Justificativa                                   |
| ------------ | ------------------------ | ----------- | ----------------------------------------------- |
| Framework    | Next.js 14 (App Router)  | ✅ Definido | Full-stack, SSR/SSG para SEO                    |
| UI           | Tailwind CSS + shadcn/ui | ✅ Definido | Componentes acessíveis, customizáveis           |
| Backend/DB   | Supabase                 | ✅ Definido | PostgreSQL + Auth + Storage + Realtime          |
| Deploy       | Vercel                   | ✅ Definido | Integração nativa com Next.js, CI/CD            |
| Pagamentos   | Mercado Pago             | ✅ Definido | PIX nativo, maior conversão BR, parcelamento 6x |
| Frete        | Melhor Envio             | ✅ Definido | Multi-transportadora, sem mensalidade           |
| NF-e         | Focus NFe                | ✅ Definido | R$80/mês (100 notas) + R$0,10/nota adicional    |
| Imagens      | Supabase Storage         | ✅ Definido | Upload de fotos de produto                      |
| Email        | Resend                   | ✅ Definido | Transacional: confirmação, status, cancelamento |
| Automação IA | OpenClaw + Telegram      | 🔜 Fase 6   | Browser automation — ver seção 9                |

---

## 3. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js)                     │
│                                                         │
│  /                   → Loja (público)                   │
│  /[categoria]        → Listagem: bolsas/vestidos/batas  │
│  /produto/[slug]     → Página de produto                │
│  /carrinho           → Carrinho                         │
│  /checkout           → Checkout + pagamento             │
│  /conta              → Área do cliente (auth)           │
│  /conta/pedidos      → Histórico de pedidos             │
│  /conta/favoritos    → Lista de desejos                 │
│  /pedido/[id]        → Status do pedido (público)       │
│  /admin              → Painel Henrique (auth admin)     │
│  /admin/estoque      → Gestão de produtos               │
│  /admin/materiais    → Matérias-primas                  │
│  /admin/bom          → Bill of Materials                │
│  /admin/producao     → Ordens de produção               │
│  /admin/pedidos      → Pedidos (varejo + atacado)       │
│  /admin/clientes     → Clientes atacado                 │
│  /admin/parceiros    → Parceiros / afiliados            │
│  /admin/cupons       → Cupons de desconto               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    SUPABASE                             │
│   PostgreSQL  │  Auth  │  Storage  │  Realtime          │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              INTEGRAÇÕES EXTERNAS                       │
│  Mercado Pago  (webhook → confirma pagamento)           │
│  Melhor Envio  (cálculo de frete + etiqueta)            │
│  Focus NFe     (emissão de NF-e por pedido)             │
│  Resend        (email transacional)                     │
│  ViaCEP        (preenchimento automático de endereço)   │
└─────────────────────────────────────────────────────────┘
```

> ⚠️ **Focus NFe usa campos PLANOS no corpo da NF-e** — `cnpj_emitente`,
> `uf_destinatario`, `icms_situacao_tributaria` —, nunca objetos aninhados. Não
> existe chave `"emitente"` nem `"destinatario"` no schema. Mandar
> `emitente: { cnpj }` faz `cnpj_emitente` chegar ausente, e a API responde
> **HTTP 403 "CNPJ do emitente não autorizado"** — mensagem de permissão para um
> erro de campo faltando. Esse engano travou a emissão por semanas, com token,
> certificado e cadastro todos corretos. Conferir nome de campo em
> https://doc.focusnfe.com.br/reference/emitir_nfe.md e
> https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html — qualquer página da doc
> aceita `.md` no fim para virar markdown.

---

## 4. Autenticação e Perfis de Usuário

> ⚠️ DECISÃO ARQUITETURAL CRÍTICA: há dois tipos de usuário autenticado no sistema.
> Ambos usam Supabase Auth. A distinção é feita pela tabela `user_profiles`.

```sql
user_profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text NOT NULL,   -- 'admin' | 'customer'
  name      text,
  phone     text,
  cpf       text,
  created_at timestamptz DEFAULT now()
)
```

### Perfil `admin`

- Apenas Henrique
- Acesso total ao `/admin`
- Criado manualmente no Supabase Dashboard
- Auth: email + senha

### Perfil `customer`

- Clientes do e-commerce
- Acesso apenas à `/conta`
- Criado automaticamente no checkout (opção de criar conta)
- Compra sem conta também é permitida (guest checkout)
- Auth: email + senha ou magic link

### RLS — Regras gerais

| Tabela                               | Leitura pública   | Escrita pública | Requer auth              |
| ------------------------------------ | ----------------- | --------------- | ------------------------ |
| `products`, `product_variants`       | ✅                | ❌              | admin                    |
| `customers`                          | ❌                | ❌              | admin + próprio customer |
| `orders`                             | ❌                | criar próprio   | admin + próprio customer |
| `wishlists`                          | ❌                | próprio         | customer                 |
| `raw_materials`, `bill_of_materials` | ❌                | ❌              | admin                    |
| `production_orders`                  | ❌                | ❌              | admin                    |
| `coupons`                            | leitura de código | ❌              | admin (CRUD)             |
| `partners`                           | ❌                | ❌              | admin                    |

---

## 5. Segurança

- **Webhook Mercado Pago:** validar assinatura HMAC antes de processar. Nunca confiar no payload sem validação.
- **Webhook Focus NFe:** idem.
- **OpenClaw (Fase 6):** acesso ao admin via credenciais salvas localmente no servidor OpenClaw. Não armazenar senha do admin no código do projeto.
- **HTML semântico no admin:** IDs e `data-*` atributos estáveis nos elementos interativos do painel. Não usar IDs gerados dinamicamente (ex: `id="btn-${Math.random()}`). Requisito para automação confiável via OpenClaw.
- **Variáveis de ambiente:** nunca hardcodar keys. `.env.local` + Vercel env vars.

---

## 6. Modelagem de Dados

### 6.1 Produtos e Catálogo

```sql
products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  description     text,
  category        text NOT NULL,          -- 'bolsas' | 'roupas' | 'acessorios'
  subcategory     text,                   -- 'vestidos' | 'batas' | null
  base_price      numeric(10,2) NOT NULL,
  wholesale_price numeric(10,2),          -- null = não disponível no atacado
  is_active       boolean DEFAULT true,
  images          text[],                 -- array de URLs (Supabase Storage)
  -- Dados para frete (obrigatório antes da Fase 3)
  weight_grams    integer,                -- peso em gramas
  length_cm       integer,               -- comprimento em cm
  width_cm        integer,
  height_cm       integer,
  -- Tabela de medidas (para roupas — exibida na página do produto)
  measurements    jsonb,                 -- { "P": "Busto 88cm...", "M": "..." } | null
  created_at      timestamptz DEFAULT now()
)

product_variants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid REFERENCES products(id) ON DELETE CASCADE,
  sku             text UNIQUE NOT NULL,
  size            text,                   -- 'P' | 'M' | 'G' | 'Único'
  color           text,
  stock_quantity  integer NOT NULL DEFAULT 0,  -- FONTE DE VERDADE do estoque acabado
  created_at      timestamptz DEFAULT now()
)
```

> ⚠️ REGRA CRÍTICA: `product_variants.stock_quantity` é a fonte de verdade do estoque
> de produto acabado. Toda venda decrementa este campo via Server Action atômica.
> Nunca decrementar sem verificar disponibilidade. Nunca ir abaixo de 0.

### 6.2 Matérias-Primas e BOM

> ⚠️ REDESENHO (jul/2026 — migrations 028–031). O Henrique não controla metro de
> lona/couro/forro: ele controla **peça cortada**. As categorias espelham as
> seções da ficha técnica e a receita passou a ser **do produto**, não da variante.

```sql
raw_materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  category        text NOT NULL,          -- 'Corte Lona' | 'Corte Forro' | 'Corte Couro'
                                          -- | 'Aplicações' | 'Metais' | 'Aviamentos'
  type_specific   text,                   -- a peça, nomeada como na ficha ('Frente', 'Casinha')
  color           text,                   -- obrigatória nos cortes; NULL nos demais
  unit            text NOT NULL,          -- 'metro' | 'unidade' | 'kg' | 'cm'
  stock_quantity  numeric(10,3) NOT NULL DEFAULT 0,
  minimum_stock   numeric(10,3) DEFAULT 0,
  cost_per_unit   numeric(10,2),
  supplier        text,
  updated_at      timestamptz DEFAULT now()
)
-- Um insumo é único por (category, type_specific, color).

bill_of_materials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- Insumo de cor fixa (Aplicações, Metais, Aviamentos):
  raw_material_id   uuid REFERENCES raw_materials(id) ON DELETE RESTRICT,
  -- Corte, cuja cor sai da variante:
  material_category text,                 -- 'Corte Lona' | 'Corte Forro' | 'Corte Couro'
  material_type     text,
  quantity_needed   numeric(10,3) NOT NULL,
  -- CHECK: exatamente uma das duas formas de endereçar o insumo
)

-- Categorias que exigem cor. É dado, não literal em código: uma categoria nova
-- entra por INSERT, sem migration nem deploy (migration 035).
cut_categories (
  category   text PRIMARY KEY,   -- 'Corte Lona' | 'Corte Forro' | 'Corte Couro' | 'Corte Tecido'
  label      text NOT NULL,
  sort_order integer NOT NULL,
  is_active  boolean DEFAULT true
)

-- A paleta, escopada por categoria: couro tem a paleta dele, lona a dela.
material_colors (
  id             uuid PRIMARY KEY,
  category       text REFERENCES cut_categories(category),
  name           text NOT NULL,
  hex            text,
  is_placeholder boolean DEFAULT false,  -- só a "Indefinida"
  is_active      boolean DEFAULT true,
  UNIQUE (category, name)
)

-- A cor que a variante usa em cada PEÇA de corte. Uma linha por item de corte da
-- receita — não uma por categoria.
variant_cut_colors (
  variant_id    uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  category      text,
  material_type text,   -- a peça: 'Frente', 'Alça', 'Boca de palhaço'...
  color         text NOT NULL,
  PRIMARY KEY (variant_id, category, material_type),
  FOREIGN KEY (category, color) REFERENCES material_colors(category, name) ON UPDATE CASCADE
)
```

> ⚠️ A FK composta é o que impede cor de variante fora da paleta. Antes as cores
> eram três colunas de texto livre na variante (`color_lona/forro/couro`), e um
> espaço a mais quebrava a receita em silêncio. Removidas na migration 035.

> ⚠️ **A cor é por peça, não por categoria** (migration 037). A chave primária
> inclui `material_type`. Uma variante da Bolsa Lyra tem **9 linhas** — quatro de
> Corte Lona, quatro de Corte Forro e uma de Corte Couro —, não 3. Na prática as
> peças de uma mesma categoria costumam repetir a cor, mas o schema não obriga:
> dá para ter a alça de uma cor e a frente de outra.

**Obrigatoriedade.** A variante precisa declarar cor em **cada peça de corte** que
a receita do produto usa — o modal bloqueia e `saveVariantCutColors` revalida no
servidor. A cor `"Indefinida"` (`is_placeholder`) existe só para o backfill dos
dados legados: não é oferecida no dropdown para variante nova, e
`complete_production_order` recusa OP que ainda esteja nela.

**Como a receita vira lista de insumos.** A receita é cadastrada uma vez por
produto e herdada por todas as variantes. Os itens de corte guardam só categoria e
tipo; a cor vem da variante, casada por `(category, material_type)`. O insumo é
então encontrado por `raw_materials.category + type_specific + color`. A função `resolve_variant_bom(variant_id)` faz a tradução e
é o único caminho para ler a receita de uma variante (wrapper TS em
`lib/supabase/bom.ts`). Ela devolve `resolved = false` quando o insumo naquela
cor ainda não existe — pendência de cadastro, que bloqueia a conclusão da OP.

```
Bolsa Lyra ── receita única do produto (17 itens: 9 cortes + 8 de cor fixa)
   │
   ├─ variante Mostarda ── 9 linhas em variant_cut_colors, uma por peça:
   │     Corte Lona  › Frente · Costas · Lateral · Alça          → Mostarda
   │     Corte Forro › Frente · Costas · Bolso canguru · Bolso de dentro → Cru
   │     Corte Couro › Boca de palhaço                            → Caramelo
   │
   └─ variante Marinho  ── outras 9 linhas:
         Corte Lona  › as mesmas 4 peças                          → Marinho
         Corte Forro › as mesmas 4 peças                          → Cru
         Corte Couro › Boca de palhaço                            → Preto
```

> `product_variants.color` ("Mostarda") é a **cor comercial**, a que o cliente vê
> na loja — texto livre, aceita qualquer rótulo. As cores de produção são outra
> coisa e vivem em `variant_cut_colors`. Uma variante comercial "Mostarda" pode
> ter lona Mostarda, forro Cru e couro Caramelo.

> ⚠️ O estoque de corte é por (peça, cor): "Corte Lona › Frente › Mostarda" é uma
> linha distinta de "Corte Lona › Frente › Marinho". A cor digitada na variante
> precisa bater exatamente com a do insumo.

### 6.3 Clientes

```sql
customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id),  -- null para guest checkout
  type        text NOT NULL,                    -- 'retail' | 'wholesale'
  name        text NOT NULL,
  email       text,
  phone       text,
  cpf_cnpj    text,
  address     jsonb,   -- {street, number, complement, neighborhood, city, state, zip}
  created_at  timestamptz DEFAULT now()
)
```

### 6.4 Pedidos

```sql
orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid REFERENCES customers(id),
  type            text NOT NULL,              -- 'retail' | 'wholesale'
  status          text NOT NULL DEFAULT 'pending',
  -- retail:    pending → paid → separating → shipped → delivered | cancelled
  -- wholesale: pending → confirmed → in_production → shipped → delivered | cancelled
  total_amount    numeric(10,2) NOT NULL,
  discount_amount numeric(10,2) DEFAULT 0,
  shipping_amount numeric(10,2) DEFAULT 0,
  payment_status  text DEFAULT 'pending',     -- 'pending' | 'paid' | 'failed'
  payment_id      text,                       -- ID externo MercadoPago
  payment_method  text,                       -- 'pix' | 'credit_card' | 'boleto'
  shipping_method text,                       -- transportadora escolhida
  tracking_code   text,                       -- código dos Correios / transportadora
  coupon_id       uuid REFERENCES coupons(id),
  nfe_number      text,                       -- número da NF-e emitida
  nfe_url         text,                       -- URL do DANFE para download
  nfe_error       text,                       -- POR QUE a emissão falhou; null quando autorizada
  shipping_error  text,                       -- POR QUE a etiqueta não foi comprada
  -- Comprador CONGELADO no momento da compra (migration 046). Imutável.
  buyer_name      text,
  buyer_email     text,
  buyer_phone     text,
  buyer_cpf_cnpj  text,
  buyer_address   jsonb,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)

-- ⚠️ O pedido guarda o COMPRADOR, não só um ponteiro para customers.
-- O checkout atualiza customers a cada compra (a pessoa muda de endereço, corrige
-- o CPF), então ler o nome pelo join reescrevia o histórico: renomear o cadastro
-- mudava o nome de todos os pedidos antigos daquela pessoa — inclusive os que já
-- tinham NF-e emitida com o nome anterior. É a mesma regra do preço em
-- order_items, aplicada a quem comprou.
--
-- Toda leitura faz `buyer_* ?? customer.*`: o cadastro é a rede para os pedidos
-- anteriores à migration 046. NF-e, etiqueta, e-mails e painel já seguem isso.

order_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_variant_id uuid REFERENCES product_variants(id),
  quantity           integer NOT NULL,
  unit_price         numeric(10,2) NOT NULL,  -- snapshot — imutável após criação
  created_at         timestamptz DEFAULT now()
)
```

### 6.5 Ordens de Produção

```sql
-- ⚠ Uma OP é de UMA variante. Não existe production_order_items: a variante e a
-- quantidade vivem na própria linha da OP.
production_orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid REFERENCES orders(id),    -- nullable: OP pode ser avulsa
  product_variant_id   uuid REFERENCES product_variants(id),
  quantity_requested   integer NOT NULL DEFAULT 1,
  quantity_produced    integer NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'draft',
  -- draft → approved → in_progress → completed | cancelled
  materials_sufficient boolean,
  missing_materials    jsonb NOT NULL DEFAULT '[]',
  -- [{material_id, material_name, category, needed, available, missing, unit,
  --   required_color, resolved}]
  material_checks      jsonb NOT NULL DEFAULT '{}',   -- marcações do Henrique no card
  notes                text,
  created_by           text NOT NULL DEFAULT 'henrique',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
)
```

**Quem move o estoque são duas funções, e o par é exato:**

- `complete_production_order(op_id)` — valida em ordem: cor de corte definida (recusa
  `is_placeholder`), insumo resolvido, saldo suficiente. Só então baixa a MP e sobe o
  produto acabado, em transação única.
- `revert_production_order(op_id, target_status)` — `target_status` só aceita `draft`,
  `approved` ou `in_progress`. Devolve cada linha ao valor anterior e recusa o estorno
  se o produto acabado já tiver saído do estoque.

Ambas escrevem a auditoria com `created_by = 'henrique'` fixo no corpo da função.
Criar OP fora do painel exige espelhar `checkAndSetMaterials()`
(`lib/actions/production.ts`) para preencher `materials_sufficient` e
`missing_materials` — sem isso o card aparece sem o check de material.

### 6.6 Cupons de Desconto

```sql
coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,       -- ex: "BEMVINDO50"
  type            text NOT NULL,             -- 'percent' | 'fixed'
  value           numeric(10,2) NOT NULL,    -- 50 = 50% ou R$50,00
  min_order_value numeric(10,2) DEFAULT 0,   -- pedido mínimo para aplicar
  max_uses        integer,                   -- null = ilimitado
  uses_count      integer DEFAULT 0,
  valid_from      timestamptz DEFAULT now(),
  valid_until     timestamptz,               -- null = sem expiração
  is_active       boolean DEFAULT true,
  description     text,                      -- uso interno (ex: "Cupom boas-vindas")
  created_at      timestamptz DEFAULT now()
)
```

### 6.7 Lista de Desejos (Favoritos)

```sql
wishlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
)
```

### 6.8 Parceiros / Afiliados

```sql
partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  type            text NOT NULL,              -- 'affiliate' | 'wholesale_partner' | 'other'
  contact_name    text,
  email           text,
  phone           text,
  commission_pct  numeric(5,2),              -- % de comissão (afiliados)
  payment_day     integer,                   -- dia do mês para pagamento
  notes           text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
)

partner_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid REFERENCES partners(id) ON DELETE CASCADE,
  title       text NOT NULL,
  due_date    date,
  is_done     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
)
```

### 6.9 Auditoria de Estoque

```sql
stock_adjustments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target           text NOT NULL,             -- 'product_variant' | 'raw_material'
  target_id        uuid NOT NULL,
  quantity_before  numeric(10,3) NOT NULL,
  quantity_after   numeric(10,3) NOT NULL,
  delta            numeric(10,3) NOT NULL,    -- after - before (pode ser negativo)
  reason           text NOT NULL,
  -- 'compra_mp' | 'ajuste_inventario' | 'perda' | 'devolucao' | 'producao_concluida' | 'venda'
  notes            text,
  created_by       text NOT NULL,
  created_at       timestamptz DEFAULT now()
)
```

### 6.10 Identidade e Endereços da Loja

> ⚠️ SEPARAÇÃO (ago/2026 — migration 045). O endereço fiscal e o endereço de
> origem do frete eram as MESMAS variáveis `STORE_*` na Vercel. Com a sede em
> Minas Gerais e a loja em Arraial d'Ajuda eles deixaram de coincidir: a nota saía
> com a UF errada e toda venda para a Bahia com CFOP 5102 em vez de 6102.

São **três** coisas, não duas — a identidade jurídica é uma só, e é o que estava
duplicado entre `STORE_CNPJ` e `STORE_DOCUMENTO`.

```sql
store_settings (
  ...
  -- 1. Identidade jurídica: emitente da NF-e e remetente da etiqueta são a mesma PJ
  cnpj                  text,      -- canônico, SÓ DÍGITOS; quem exibe formata
  legal_name            text,      -- razão social, não o nome da marca
  state_registration    text,      -- IE ou a palavra 'ISENTO'
  cnae                  text,
  tax_regime            smallint NOT NULL DEFAULT 1,   -- 1 = Simples Nacional

  -- 2. Endereço fiscal (cartão CNPJ) — vai impresso na nota e DEFINE O CFOP
  fiscal_street, fiscal_number, fiscal_complement,
  fiscal_district, fiscal_city, fiscal_state, fiscal_zip   text,

  -- 3. Origem do frete — de onde a mercadoria sai fisicamente
  origin_same_as_fiscal boolean NOT NULL DEFAULT true,
  origin_street, origin_number, origin_complement,
  origin_district, origin_city, origin_state               text,
  origin_cep            text,      -- o CEP DESTE bloco; nome antigo, mantido
  origin_contact_name, origin_phone, origin_email          text
)
-- CHECK: fiscal_state e origin_state são '' ou sigla de 2 letras MAIÚSCULAS.
-- A normalização acontece em updateStoreSettings — 'ba' é rejeitado pelo banco.
```

**Como se lê.** `lib/server/store-identity.ts` é o único caminho. Nenhum outro
arquivo lê `STORE_*` para montar endereço.

- `getEmitente()` — **falha fechado.** Sem endereço fiscal completo não existe
  nota: lança nomeando o campo que falta e a tela onde preencher, e a mensagem vai
  para `orders.nfe_status = 'erro'`. Não tem fallback para variável de ambiente,
  de propósito — foi um fallback silencioso que deixou a UF errada passar.
- `getShippingOrigin()` — **degrada.** Bloco de origem incompleto cai nas
  variáveis `STORE_*` antigas, porque parar de vender é pior que despachar do
  endereço de ontem. A fonte usada aparece em `/admin/diagnostico`.

> ⚠️ A cotação do carrinho e a compra da etiqueta chamam **a mesma** função. Antes
> a cotação lia `store_settings.origin_cep` e a etiqueta lia `STORE_CEP_ORIGEM`:
> bastava editar o CEP na tela para o cliente ser cotado de um endereço e a coleta
> ser agendada em outro, sem erro em lugar nenhum.

`origin_same_as_fiscal` ligado faz a origem acompanhar o endereço fiscal — um
endereço só para manter. Ele existe para impedir a falha por omissão: corrigir o
fiscal e esquecer o de frete. Para esta loja ele está **ligado**: a mercadoria sai
de Muriaé, o mesmo endereço da empresa. A loja de Arraial d'Ajuda não despacha.

> ⚠️ **Despachar de dois lugares não é configuração, é funcionalidade.** O frete é
> cotado no carrinho, antes de existir pedido, então o sistema precisaria saber ali
> de onde cada peça sai — e `product_variants.stock_quantity` é um número só, sem
> local. Um pedido com peças de dois lugares vira duas entregas, dois fretes e duas
> etiquetas, com um preço só na tela do cliente; e a NF-e declara um local de
> retirada, não dois. Exige estoque por local antes de qualquer coisa.

**As variáveis `STORE_*` viraram rede de segurança.** Não alimentam mais a NF-e.
Podem sair da Vercel quando `/admin/diagnostico` mostrar "Fonte do endereço:
painel". `FOCUS_NFE_REGIME_TRIBUTARIO` já não é lida — virou `tax_regime`.

---

## 7. Fluxos de Negócio Críticos

### Fluxo 1 — Venda no E-commerce (Varejo)

```
Cliente adiciona ao carrinho
  → Verifica stock_quantity em tempo real (sem reservar)
  → Cliente preenche dados + endereço (ViaCEP preenche automático)
  → Sistema calcula frete via Melhor Envio
  → Cliente paga (PIX / cartão até 6x / boleto)
  → Webhook MercadoPago confirma pagamento
  → order.payment_status = 'paid'
  → DECREMENTA product_variants.stock_quantity (transação atômica)
  → Registra em stock_adjustments (reason: 'venda')
  → Email de confirmação via Resend
  → Emite NF-e via Focus NFe
  → Pedido aparece no /admin/pedidos
```

> ⚠️ Estoque só decrementa após pagamento confirmado, nunca ao adicionar ao carrinho.
> Usar transação SQL para evitar race condition em compras simultâneas.

### Fluxo 2 — Pedido Atacado (via Painel Admin)

```
Henrique recebe pedido (WhatsApp/telefone)
  → /admin/pedidos → Novo Pedido Atacado
  → Seleciona cliente + produtos + quantidades
  → Sistema verifica:
      A) Tem estoque suficiente? → Confirma e despacha
      B) Sem estoque, tem MP? → Sugere criar Ordem de Produção
      C) Sem estoque, sem MP? → Lista exatamente o que falta comprar
  → Henrique decide e comunica prazo ao cliente
```

### Fluxo 3 — Ordem de Produção

```
OP criada (manual ou automática via pedido atacado)
  → check_materials():
      Para cada item: BOM × quantidade → compara com raw_materials.stock_quantity
  → Tudo disponível: status = 'approved'
  → Algo faltando: status = 'draft', missing_materials preenchido
  → Ao concluir:
      DECREMENTA raw_materials (cada MP do BOM × quantidade produzida)
      INCREMENTA product_variants.stock_quantity
      Ambos em uma única transação SQL
      Registra em stock_adjustments (reason: 'producao_concluida')
```

### Fluxo 4 — Checkout com Cupom

```
Cliente informa código no carrinho
  → Valida: is_active, valid_until, uses_count < max_uses, min_order_value
  → Aplica desconto ao total
  → Ao confirmar pagamento: incrementa coupons.uses_count
```

### Fluxo 5 — Cancelamento de Pedido

```
Henrique ou sistema cancela pedido pago
  → REVERTE stock_quantity das variantes envolvidas
  → Registra em stock_adjustments (reason: 'devolucao')
  → Email automático ao cliente via Resend
  → Se NF-e já emitida: processo manual de cancelamento (fora do sistema)
```

---

## 8. Regras de Negócio

| #   | Regra                                                                                           |
| --- | ----------------------------------------------------------------------------------------------- |
| 1   | Estoque nunca vai abaixo de 0. Bloquear compra se `stock_quantity < quantity_requested`         |
| 2   | Preço é snapshot no momento da compra. Imutável. Mudança de preço não afeta pedidos existentes  |
| 3   | OP não avança automaticamente se faltar MP. Henrique aprova manualmente                         |
| 4   | Pedido atacado pode ter produto sem estoque (será produzido)                                    |
| 5   | Produto com `wholesale_price = null` não aparece em contexto atacado                            |
| 6   | Ao concluir OP: decrementa MP + incrementa produto acabado em transação única                   |
| 7   | Cancelamento de pedido pago: reverte estoque + email ao cliente                                 |
| 8   | Alerta automático quando `raw_materials.stock_quantity < minimum_stock`                         |
| 9   | Cupom só é consumido (uses_count++) após confirmação de pagamento                               |
| 10  | Variante esgotada aparece como "Esgotado" na loja — não some da página                          |
| 11  | Guest checkout permitido — criação de conta é opcional no checkout                              |
| 12  | NF-e emitida automaticamente após pagamento confirmado (varejo)                                 |
| 13  | Peso e dimensões do produto são obrigatórios para calcular frete — bloquear publicação sem eles |
| 14  | Endereço fiscal incompleto BLOQUEIA a emissão da NF-e. Nunca emitir com endereço parcial ou com fallback |
| 15  | CFOP sai da UF do endereço FISCAL contra a UF do cliente — nunca da UF de origem do frete |
| 16  | Nome, CPF e endereço do pedido são snapshot imutável. Ler sempre `orders.buyer_*`, nunca o join com `customers` |
| 17  | Falha de NF-e ou de etiqueta grava o motivo em `nfe_error`/`shipping_error`. Status de erro sem mensagem é bug |

---

## 9. Integração OpenClaw + Telegram (Fase 6)

### O que é

OpenClaw é uma ferramenta de automação por browser (computer use). Ele "vê" e "clica"
na interface do admin como um humano faria. O Henrique envia comandos pelo Telegram
("quero criar um pedido de atacado para a Fernanda") e o OpenClaw executa no painel.

### Hospedagem

OpenClaw rodando na Hostinger (servidor do Henrique). Não requer modificação de código
do projeto — acessa o admin via URL pública com credenciais salvas localmente.

### Requisito técnico para o painel admin

Para que o OpenClaw funcione de forma confiável, o painel admin deve:

- Usar IDs semânticos e estáveis nos elementos interativos: `id="btn-novo-pedido"`, não `id="btn-${uuid}"`
- Usar `data-testid` nos formulários e botões principais
- Evitar modais ou ações que dependam de timing/animação para serem clicáveis
- Ter mensagens de sucesso/erro claras e textuais (não apenas ícones)

### Escopo da Fase 6

- Comandos via Telegram: criar pedido atacado, consultar estoque, aprovar OP
- OpenClaw configurado pelo desenvolvedor com os fluxos principais
- Fora do escopo: automação de checkout do e-commerce público

---

## 10. Estrutura de Pastas (Next.js App Router)

```
/
├── app/
│   ├── (store)/                    # Grupo: loja pública
│   │   ├── page.tsx                # Home / vitrine
│   │   ├── [categoria]/            # Listagem: /bolsas, /vestidos, /batas
│   │   ├── produto/[slug]/         # Página de produto
│   │   ├── carrinho/               # Carrinho
│   │   ├── checkout/               # Checkout + pagamento
│   │   ├── pedido/[id]/            # Consulta pública de status
│   │   └── conta/                  # Área do cliente (auth customer)
│   │       ├── pedidos/
│   │       └── favoritos/
│   ├── admin/                      # Painel admin (auth admin)
│   │   ├── layout.tsx              # Layout com sidebar
│   │   ├── page.tsx                # Dashboard
│   │   ├── estoque/
│   │   ├── materiais/
│   │   ├── bom/
│   │   ├── producao/
│   │   ├── pedidos/
│   │   ├── clientes/
│   │   ├── parceiros/
│   │   └── cupons/
│   ├── api/
│   │   └── webhooks/
│   │       ├── payment/            # MercadoPago
│   │       └── nfe/                # Focus NFe (status da nota)
│   └── layout.tsx
├── components/
│   ├── store/
│   └── admin/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── actions/
│   │   ├── orders.ts
│   │   ├── stock.ts
│   │   ├── production.ts
│   │   ├── coupons.ts
│   │   └── nfe.ts
│   ├── integrations/
│   │   ├── mercadopago.ts
│   │   ├── melhor-envio.ts
│   │   ├── focus-nfe.ts
│   │   └── resend.ts
│   ├── types.ts
│   ├── mock-data.ts
│   └── utils.ts
└── supabase/
    ├── migrations/
    └── seed.sql
```

---

## 11. Fases do Projeto

### Fase 1 — Loja online funcional (semana 1–2)

- [ ] Design system + scaffold Next.js
- [ ] Catálogo: home, listagem por categoria, página de produto
- [ ] Carrinho e checkout completo
- [ ] Integração MercadoPago (PIX, cartão, boleto)
- [ ] Cálculo de frete via Melhor Envio
- [ ] Email de confirmação via Resend

**Critério:** Conseguir comprar do início ao fim, receber email, ver pedido no painel.

### Fase 2 — Painel de gestão funcional (semana 2–3)

- [ ] Auth (admin + customer)
- [ ] CRUD de produtos e variantes com upload de fotos
- [ ] Gestão de estoque com auditoria
- [ ] Visualização e gestão de pedidos
- [ ] Código de rastreio + atualização de status

**Critério:** Cadastrar produtos, ajustar estoque e atender pedido sem ajuda.

### Fase 3 — Frete + Dimensões + NF-e (semana 3)

- [ ] Campos de peso e dimensões nos produtos
- [ ] Geração de etiqueta via Melhor Envio no detalhe do pedido
- [ ] Integração Focus NFe (emissão automática pós-pagamento)

**Critério:** Pedido pago → NF-e emitida automaticamente → etiqueta disponível.

### Fase 4 — Controle de matéria-prima (semana 3–4)

- [ ] Gestão de matérias-primas
- [ ] Bill of Materials por variante
- [ ] Alertas de estoque mínimo

**Critério:** Cadastrar MP e definir receita de pelo menos 3 produtos.

> ⚠️ Depende do Henrique ter mapeado o BOM antes de iniciar.

### Fase 5 — Sistema de produção + Atacado (semana 4)

- [ ] Ordens de produção com check automático de MP
- [ ] Pedidos de atacado via painel admin
- [ ] Cenários A/B/C de verificação de estoque

**Critério:** Criar OP do zero, sistema confere material, produção concluída atualiza estoque.

### Fase 6 — Funcionalidades de loja (semana 5–6)

- [ ] Contas de clientes (login, histórico, favoritos)
- [ ] Cupons de desconto
- [ ] Sistema de indicações
- [ ] Banner de boas-vindas com desconto
- [ ] Páginas institucionais (FAQ, políticas, sobre, contato)
- [ ] SEO técnico (sitemap, meta tags, OG)

**Critério:** Todas as políticas publicadas. Cliente consegue criar conta e ver histórico.

### Fase 7 — Parceiros + OpenClaw (semana 6–7)

- [ ] Gestão de parceiros/afiliados no painel
- [ ] Configuração do OpenClaw + Telegram
- [ ] Testes de automação dos fluxos principais

**Critério:** Henrique consegue criar pedido atacado via comando no Telegram.

### Fase 8 — Lançamento e estabilização (semana 7–8)

- [ ] Testes end-to-end com dados reais
- [ ] Primeira venda real processada
- [ ] Operação monitorada por 1 semana sem problemas

---

## 12. Decisões em Aberto

| Decisão                  | Status            | Observação                               |
| ------------------------ | ----------------- | ---------------------------------------- |
| Gateway de pagamento     | ✅ Mercado Pago   | PIX 0,99%, cartão 4,99%, parcelamento 6x |
| Frete                    | ✅ Melhor Envio   | Multi-transportadora, sem mensalidade    |
| NF-e                     | ✅ Focus NFe      | R$80/mês + R$0,10/nota                   |
| Portal atacado           | ✅ Tudo via admin | Sem portal próprio para atacadistas      |
| Pedido mínimo atacado    | ❓ Pendente       | Alinhar com Henrique                     |
| Endereço fiscal (cartão CNPJ) | ✅ Preenchido | Rua Desembargador Canedo, 215 B — Centro, **Muriaé/MG**, 36880-078. CNPJ 38.142.237/0001-80, IE 0042608620043 (13 dígitos, formato MG — bate com a UF), razão social H M T CARREIRA MODAS. A origem do frete continua em Arraial d'Ajuda/BA |
| Local de retirada na NF-e | ✅ Não se aplica | O Henrique confirmou que a mercadoria sai de Muriaé, o mesmo endereço fiscal. `origin_same_as_fiscal` ligado, e o bloco de origem antigo (Arraial) limpo. Nota e frete saem do mesmo lugar, então não há local de retirada a declarar. Se um dia passar a sair de dois lugares, ver a nota abaixo |
| DIFAL nas vendas interestaduais | ❓ Pendente | Com o emitente em MG, toda venda para a BA virou 6102. Empresa do Simples Nacional em tese não recolhe DIFAL como remetente, mas é confirmação do contador, não do sistema |
| Melhor Envio produção    | ⚠️ Sandbox ativo  | Ao migrar para a conta real: trocar `MELHOR_ENVIO_TOKEN`/`MELHOR_ENVIO_BASE_URL` e recadastrar a URL do webhook `/api/webhooks/shipping?token=<MELHOR_ENVIO_WEBHOOK_SECRET>` no painel ME de produção (config do sandbox não migra) |
| Notificações WhatsApp    | ❓ Pendente       | Fase 2 — Z-API ou Evolution API          |
| Domínio do site          | ❓ Pendente       | Usar existente ou criar novo             |
| Dia fixo reunião semanal | ❓ Pendente       | Definir com Henrique                     |

---

## 13. Glossário do Domínio

| Termo               | Definição no sistema                                            |
| ------------------- | --------------------------------------------------------------- |
| **SKU**             | Código único de uma variante (ex: BOL-TIRA-MARG-UNICO)          |
| **Variante**        | Combinação produto + tamanho + cor com estoque próprio          |
| **BOM**             | Bill of Materials — lista de MP para produzir 1 unidade         |
| **OP**              | Ordem de Produção — instrução para fabricar X unidades          |
| **Check de MP**     | Verificação automática de suficiência de matéria-prima          |
| **Estoque acabado** | Produtos prontos para venda (`product_variants.stock_quantity`) |
| **Estoque MP**      | Matérias-primas disponíveis (`raw_materials.stock_quantity`)    |
| **Atacado**         | Venda B2B, preço diferenciado, pedidos via painel admin         |
| **Varejo**          | Venda B2C via e-commerce público                                |
| **Guest checkout**  | Compra sem criar conta na loja                                  |
| **OpenClaw**        | Ferramenta de automação visual do painel via Telegram           |
