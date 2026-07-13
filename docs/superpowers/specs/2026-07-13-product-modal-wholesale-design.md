# Modal de produto, destaques, observação no atacado, import CSV e Playwright

Data: 2026-07-13
Status: aprovado para implementação

## Contexto

Henrique opera o painel `/admin` sozinho. Pedido dele, em 5 seções independentes:

1. Modal de produto (criar/editar) centralizado, com fotos por variante, BOM (receita)
   já na criação, e peso/dimensões visíveis no form.
2. Observação em pedido atacado (já existe na criação — falta exibir).
3. Escolher produtos em destaque na home (hoje é lista fixa `FEATURED_SLUGS` no código).
4. Importação de CSV para atualizar estoque/preços em massa.
5. Playwright para testes E2E do admin.

Decisões já validadas com o Henrique (via AskUserQuestion):
- Fotos migram totalmente para o nível de variante (não fallback híbrido).
- Peso/dimensões continuam por produto (não por variante).
- Destaque é por produto (não por variante específica).
- Playwright configurado agora, junto com o resto.
- CSV só atualiza produtos/variantes existentes (não cria), casa por SKU, cobre
  estoque + preços. Botão fica em `/admin/estoque`.
- BOM deve poder ser cadastrado já na criação do produto, não só na edição.

## Seção 1 — Modal de Produto

### Schema

Migration `025_variant_images_and_featured.sql`:
- `product_variants.images text[] default '{}'` (nova coluna — fonte de verdade daqui pra frente)
- `products.is_featured boolean default false`
- Backfill: copia `products.images` para `product_variants.images` de variantes existentes
  que ainda estejam vazias.
- **`products.images` é mantido no schema** (não é dropado) por segurança — evita reescrever
  `seed.sql` inteiro e qualquer script externo que dependa da coluna. O código da aplicação
  para de ler/escrever nela a partir desta mudança. `seed.sql` ganha um `UPDATE` ao final
  espelhando o backfill da migration, para que um banco recriado do zero também popule
  `product_variants.images`.

### Tipos (`lib/types.ts`)
- `ProductVariant.images: string[]` (novo)
- `Product.is_featured: boolean` (novo)
- `Product.images` permanece no tipo (legado, não utilizado pelo código novo) para não
  quebrar `lib/mock-data.ts`, que não é importado por nenhuma rota mas é type-checked pelo build.

### Server actions (`lib/actions/products.ts`)

Unifica o formato de variante entre criar/editar:

```ts
type VariantBomInput = { raw_material_id: string; quantity_needed: number }
type VariantInput = {
  tempId: string          // chave estável do client, sempre presente
  id?: string             // presente se a variante já existe no banco
  color: string | null
  size: string | null
  sku: string
  stock_quantity: number
  images: string[]
  bom: VariantBomInput[]  // lista completa desejada — servidor substitui a existente
}
```

- `createProduct`: cria o produto → cria cada variante (loop sequencial, captura o id
  retornado) → para cada variante com `bom.length > 0`, insere as linhas em
  `bill_of_materials`. Tudo em uma única server action, sem etapa intermediária de salvar
  e reabrir.
- `updateProduct`: atualiza campos do produto (inclui `is_featured`, peso/dimensões) →
  para cada variante do input: se tem `id`, atualiza os campos e **substitui** o BOM
  (deleta tudo de `bill_of_materials` daquela variante e reinsere a lista enviada — mais
  simples que diff, aceitável pelo tamanho pequeno das receitas); se não tem `id` (variante
  nova adicionada durante a edição), insere variante + BOM do mesmo jeito que na criação.
- **Sem exclusão de variante já persistida** pela UI — evita quebrar `order_items` que
  referenciam `product_variant_id`. O botão de remover linha só aparece para variantes
  ainda não salvas nesta sessão do modal.
- `uploadProductImage` não muda (upload genérico) — mas passa a ser chamado por variante,
  não por produto.

### Componente (`components/admin/produto-modal.tsx`, substitui `produto-drawer.tsx`)

Modal centralizado (`.modal` largo, ~760px) em vez de drawer lateral. Seções:

1. **Dados gerais**: nome, descrição, categoria/subcategoria, preços, ativo/inativo, tags,
   **checkbox novo "Destaque na home"**.
2. **Peso e dimensões** (novo, por produto): `weight_grams`, `length_cm`, `width_cm`,
   `height_cm` — campos numéricos, com nota de que são obrigatórios para o frete.
3. **Dados fiscais**: NCM/CFOP (mantém).
4. **Variantes**: lista de cards expansíveis (não mais linhas de tabela simples). Cada
   card tem cor/tamanho/SKU/estoque + dropzone de fotos da variante + mini-tabela de BOM
   (selecionar matéria-prima + quantidade, reaproveitando a lista de `raw_materials` já
   buscada em `/admin/materias`).

`data-testid` novos: `input-peso`, `input-comprimento`, `input-largura`, `input-altura`,
`checkbox-destaque`, `dropzone-variante-{tempId}`, `select-bom-material-{tempId}`,
`input-bom-qtd-{tempId}`, `btn-add-bom-{tempId}`.

### Storefront (leitura de imagens por variante)

- `components/store/product-card.tsx`: `firstImage` passa a vir de
  `product.variants?.[0]?.images?.[0] ?? null`.
- `components/store/product-detail.tsx`: galeria usa `selectedVariant?.images` em vez de
  `product.images`; ao trocar de cor, a galeria troca junto. Sem variante selecionada
  (antes de escolher cor/tamanho), usa a primeira variante do produto.
- `lib/cart-context.tsx`: `LastAdded.image` passa a vir de `variant.images[0]`.
- `lib/supabase/products.ts` e `lib/supabase/admin-queries.ts`: sem mudança de query
  (já usam `select('*')` em variants — a nova coluna vem junto).

## Seção 2 — Observação no pedido atacado (gap de exibição)

Já funciona ponta a ponta na criação (`orderNotes` → `createWholesaleOrder` → coluna
`orders.notes`, já selecionada em `getWholesaleOrders`). Falta:

- `getWholesaleOrders` (admin-queries.ts): incluir `items` detalhado (nome do produto,
  SKU, quantidade, preço unitário) — hoje só tem `item_count`. Mesma forma já usada em
  `getRetailOrders`.
- `components/admin/pedidos-client.tsx`: a aba atacado hoje não tem linha expansível
  (só tem menu de ações). Adicionar botão de expandir (reaproveita o padrão da aba
  varejo) mostrando itens do pedido + total + **observações** (`o.notes`).

## Seção 3 — Destaques na home

- Migration 025 já cria `products.is_featured`.
- Checkbox no modal de produto (seção 1).
- `lib/supabase/products.ts`: `getFeaturedProducts()` deixa de receber `slugs: string[]`.
  Passa a buscar `is_active = true AND is_featured = true`, ordenado por `created_at desc`,
  limite 15. Se vier menos de 15, completa com os produtos ativos mais recentes que ainda
  não estão na lista (evita seção vazia/pequena demais na home).
- `app/(store)/page.tsx`: remove a constante `FEATURED_SLUGS` e a chamada passa a ser
  `getFeaturedProducts()` sem argumento.

## Seção 4 — Importação CSV (Estoque/Preços)

- Botão "Importar CSV" ao lado de "Exportar" em `/admin/estoque`
  (`components/admin/estoque-client.tsx`).
- Formato esperado (cabeçalho obrigatório): `sku,stock_quantity,base_price,wholesale_price`.
  `sku` é obrigatório em toda linha; os demais são opcionais — célula vazia = não muda
  aquele campo.
- Fluxo: escolher arquivo → parse client-side (parser simples, sem lib — colunas são só
  SKU/números, sem necessidade de suportar vírgulas dentro de campo) → **tela de preview**
  listando, por linha, "SKU X: estoque 10 → 15, preço R$ 50 → R$ 55"; linhas com SKU não
  encontrado aparecem marcadas em erro e são ignoradas na confirmação.
- Aviso fixo no preview: como preço é por **produto** (não por variante), mudar o preço
  de um SKU muda o preço de todas as variantes daquele produto.
- Botão "Baixar modelo" gera um CSV de exemplo client-side (Blob) com 2 linhas de exemplo.
- Nova server action `importStockPriceCsv` em `lib/actions/products.ts`: para cada linha
  válida, resolve a variante pelo SKU; se `stock_quantity` vier preenchido, atualiza e
  registra em `stock_adjustments` (reason `ajuste_inventario`, notes `"Importação CSV"`,
  mesmo padrão de `adjustVariantStock`); se `base_price`/`wholesale_price` vierem
  preenchidos, atualiza o produto correspondente (linhas processadas em ordem — se duas
  linhas do CSV mudarem preço de variantes do mesmo produto, a última processada vence,
  o preview já deixa isso visível antes de confirmar).

## Seção 5 — Playwright

- Nova devDependency `@playwright/test`.
- `playwright.config.ts` na raiz — `baseURL` via `process.env.E2E_BASE_URL` (default
  `http://localhost:3000`), projeto único `chromium`.
- Script `"test:e2e": "playwright test"` em `package.json`.
- Pasta `e2e/` com specs:
  1. `e2e/produto-modal.spec.ts` — cria produto novo com 1 variante (cor/tamanho/SKU/
     estoque + 1 item de BOM), confirma que aparece na tabela de estoque.
  2. `e2e/pedido-atacado-notas.spec.ts` — cria pedido atacado com observação preenchida,
     expande o pedido criado e confirma que a observação aparece.
  3. `e2e/destaque-home.spec.ts` — marca um produto como destaque no modal, confirma que
     ele aparece na seção "Destaques" da home.
- **Limitação assumida**: os testes pressupõem uma sessão admin autenticada. Como não há
  storageState/credenciais de teste configuradas neste ambiente, os specs ficam prontos
  e corretos contra os `data-testid`/ids estáveis, mas **não foram executados ponta a
  ponta nesta sessão** — falta o Henrique configurar `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`
  (ou um `storageState.json` gerado uma vez via login manual) para rodar de fato.
- **Limitação adicional deste ambiente**: o worktree usado nesta sessão não tem
  `.env.local` com credenciais Supabase, então nem o `npm run dev` nem o `npm run build`
  conseguem renderizar rotas que tocam o banco (erro "URL and Key are required" — mesmo
  em páginas que já existiam antes desta mudança, como `/admin/relatorios`). A validação
  possível foi `npx tsc --noEmit` (limpo) e `npm run build` até "✓ Compiled successfully"
  (falha só depois, na geração estática, por falta de env — não por erro de código).
  QA visual real do modal/CSV/destaques precisa rodar num ambiente com Supabase configurado.

## Fora de escopo (explicitamente adiado)

- Reordenar manualmente os produtos em destaque (usa `created_at desc` como critério).
- Exclusão de variantes já persistidas pela UI do modal.
- Import CSV criando produtos novos (só atualiza existentes).
- Diff fino de BOM na edição (substituição total é aceitável dado o tamanho da receita).
