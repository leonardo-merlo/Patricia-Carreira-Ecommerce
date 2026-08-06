# Cores de produção por variante — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a cor de produção obrigatória e visível na variante, com paleta gerenciada por categoria de corte, adicionando a categoria Corte Tecido.

**Architecture:** A receita continua sendo do produto. As três colunas `color_lona/forro/couro` da variante dão lugar a `variant_cut_colors` (uma linha por variante × categoria), com FK composta para `material_colors`, que é a paleta escopada por `cut_categories`. As categorias de corte passam a ser dado, não literal em código: `resolve_variant_bom` e `pending_cut_materials` trocam o `CASE` escrito à mão por um `JOIN`. Na UI, o card da variante ganha a receita herdada resolvida no cliente, com um dropdown de cor por categoria.

**Tech Stack:** Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + RLS) · Playwright · Server Actions

**Spec:** [`docs/superpowers/specs/2026-08-06-cores-de-producao-por-variante-design.md`](../specs/2026-08-06-cores-de-producao-por-variante-design.md)

---

## Contexto que o executor precisa saber

**Domínio.** "Corte" é peça já cortada (Frente, Casinha, Fundo), não metro de tecido. O estoque é por `(peça, cor)`: "Corte Lona › Frente › Mostarda" é uma linha diferente de "Corte Lona › Frente › Marinho". A receita do produto guarda só `(categoria, tipo)`; a cor vem da variante em tempo de consulta.

**Estado do banco hoje** (medido em 2026-08-06): 36 produtos, 97 variantes, 143 itens de receita (70 de corte, em 5 produtos / 23 variantes), **zero** insumos de corte, **zero** cores. O backfill cria 69 linhas em "Indefinida".

**Migrations rodam direto no Supabase** via a ferramenta MCP `mcp__supabase__apply_migration`, e o `.sql` é salvo em `supabase/migrations/` só como histórico. Não peça ao usuário para rodar nada no dashboard.

**Regras do projeto que valem aqui:** TypeScript strict, sem `any`. Sem instalar dependência. IDs e `data-testid` estáveis nos elementos do admin (requisito de automação OpenClaw — ver CLAUDE.md seção 9). Nada de `@apply`.

**Este ambiente não tem env do Supabase para o Next.js.** `npm run dev` e as rotas com DB não sobem. O que valida é `npx tsc --noEmit`, `npm run build` e as queries SQL via MCP.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `supabase/migrations/035_cut_categories_and_variant_colors.sql` (criar) | Cópia versionada do DDL aplicado via MCP |
| `lib/types.ts` (modificar) | `CutCategory` deixa de ser união literal; entram `CutCategoryRow`, `MaterialColor`, `VariantCutColor` |
| `lib/supabase/admin-queries.ts` (modificar) | `getCutCategories`, `getMaterialColors`; `cut_colors` na query de produtos; `color` nas compras |
| `lib/actions/material-colors.ts` (criar) | Server action `createMaterialColor` |
| `lib/actions/products.ts` (modificar) | `VariantInput.cut_colors`; validação server-side; persistência em `variant_cut_colors` |
| `lib/actions/raw-materials.ts` (modificar) | Remove a constante `CUT_CATEGORIES` hardcoded |
| `components/admin/color-select.tsx` (criar) | Dropdown de cor + `+ Nova cor` inline |
| `components/admin/variant-recipe.tsx` (criar) | Bloco de receita dentro do card da variante, com resolução no cliente |
| `components/admin/produto-modal.tsx` (modificar) | Receita sobe para antes das Variantes; usa os dois componentes novos; validação |
| `components/admin/materias-client.tsx` (modificar) | Coluna Cor nas 3 abas; seletor de variante em Receitas |
| `app/admin/estoque/page.tsx` (modificar) | Passa `cutCategories` e `materialColors` |
| `app/admin/materias/page.tsx` (modificar) | Idem |
| `e2e/produto-modal.spec.ts` (modificar) | Teste: variante não salva sem cor |

`variant-recipe.tsx` e `color-select.tsx` saem de fora do `produto-modal.tsx` de propósito: ele já tem 830 linhas e a lógica de resolução da receita sozinha acrescentaria umas 200.

---

## Task 1: Migration — tabelas, backfill e funções

**Files:**
- Create: `supabase/migrations/035_cut_categories_and_variant_colors.sql`
- Aplicar via: ferramenta MCP `mcp__supabase__apply_migration`

- [ ] **Step 1: Medir o estado antes, para comparar depois**

Rode via `mcp__supabase__execute_sql`:

```sql
select
  (select count(*) from product_variants) as variantes,
  (select count(*) from bill_of_materials where material_category is not null) as itens_corte,
  (select count(distinct v.id)
     from product_variants v
     join bill_of_materials b on b.product_id = v.product_id
    where b.material_category is not null) as variantes_com_corte;
```

Esperado: `variantes = 97`, `itens_corte = 70`, `variantes_com_corte = 23`.

Se der diferente, **pare e reporte** — o número de linhas do backfill no Step 4 depende disso.

- [ ] **Step 2: Escrever o arquivo da migration**

Crie `supabase/migrations/035_cut_categories_and_variant_colors.sql` com exatamente este conteúdo:

```sql
-- Migration 035: cores de produção por variante
--
-- Antes: a variante tinha color_lona/color_forro/color_couro como texto livre,
-- opcional, e o mapeamento categoria→coluna era um CASE escrito à mão em duas
-- funções. Adicionar uma categoria custava migration + código.
--
-- Agora:
--   · cut_categories    — quais categorias exigem cor (dado, não literal);
--   · material_colors   — a paleta, escopada por categoria;
--   · variant_cut_colors— a cor que a variante usa em cada categoria, com FK
--                         composta para a paleta (impede cor fora dela).
--
-- Entra a 4ª categoria: Corte Tecido.

-- ─── 1. Categorias de corte ──────────────────────────────────────────────────
CREATE TABLE public.cut_categories (
  category   text PRIMARY KEY,
  label      text NOT NULL,
  sort_order integer NOT NULL,
  is_active  boolean NOT NULL DEFAULT true
);

INSERT INTO public.cut_categories (category, label, sort_order) VALUES
  ('Corte Lona',   'Lona',   1),
  ('Corte Forro',  'Forro',  2),
  ('Corte Couro',  'Couro',  3),
  ('Corte Tecido', 'Tecido', 4);

ALTER TABLE public.cut_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_cut_categories" ON public.cut_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON public.cut_categories TO service_role;
GRANT SELECT ON public.cut_categories TO authenticated, anon;

-- ─── 2. Paleta de cores, por categoria ───────────────────────────────────────
CREATE TABLE public.material_colors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category       text NOT NULL REFERENCES public.cut_categories(category) ON UPDATE CASCADE,
  name           text NOT NULL,
  hex            text,
  is_placeholder boolean NOT NULL DEFAULT false,
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  CONSTRAINT material_colors_category_name_key UNIQUE (category, name)
);

-- A paleta nasce só com o marcador de pendência: não há cor cadastrada no banco
-- de onde herdar, e inventar cor de negócio seria chute.
INSERT INTO public.material_colors (category, name, is_placeholder, sort_order)
SELECT category, 'Indefinida', true, -1 FROM public.cut_categories;

CREATE INDEX material_colors_category_idx ON public.material_colors (category);

ALTER TABLE public.material_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_material_colors" ON public.material_colors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON public.material_colors TO service_role;
GRANT SELECT ON public.material_colors TO authenticated, anon;

-- ─── 3. Cor da variante por categoria ────────────────────────────────────────
CREATE TABLE public.variant_cut_colors (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  category   text NOT NULL,
  color      text NOT NULL,
  PRIMARY KEY (variant_id, category),
  CONSTRAINT variant_cut_colors_palette_fk
    FOREIGN KEY (category, color)
    REFERENCES public.material_colors (category, name) ON UPDATE CASCADE
);

CREATE INDEX variant_cut_colors_variant_idx ON public.variant_cut_colors (variant_id);

ALTER TABLE public.variant_cut_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_variant_cut_colors" ON public.variant_cut_colors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON public.variant_cut_colors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variant_cut_colors TO authenticated;
GRANT SELECT ON public.variant_cut_colors TO anon;

-- ─── 4. Backfill ─────────────────────────────────────────────────────────────
-- Uma linha por (variante, categoria) que a receita do produto realmente usa.
-- Nenhuma variante tem cor preenchida hoje, então tudo entra como 'Indefinida'.
-- O COALESCE cobre o caso de a migration rodar num banco onde alguém já tenha
-- preenchido as colunas antigas: a cor só é aproveitada se existir na paleta.
INSERT INTO public.variant_cut_colors (variant_id, category, color)
SELECT DISTINCT
  v.id,
  b.material_category,
  COALESCE(
    (SELECT mc.name FROM public.material_colors mc
      WHERE mc.category = b.material_category
        AND mc.name = CASE b.material_category
              WHEN 'Corte Lona'  THEN v.color_lona
              WHEN 'Corte Forro' THEN v.color_forro
              WHEN 'Corte Couro' THEN v.color_couro
            END),
    'Indefinida'
  )
FROM public.product_variants v
JOIN public.bill_of_materials b ON b.product_id = v.product_id
WHERE b.material_category IS NOT NULL;

-- ─── 5. bill_of_materials: CHECK fixo vira FK ────────────────────────────────
ALTER TABLE public.bill_of_materials
  DROP CONSTRAINT IF EXISTS bom_variable_category_check;

ALTER TABLE public.bill_of_materials
  ADD CONSTRAINT bom_material_category_fk
  FOREIGN KEY (material_category)
  REFERENCES public.cut_categories(category) ON UPDATE CASCADE;

-- ─── 6. Funções resolvem por JOIN, não por CASE ──────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_variant_bom(p_variant_id uuid)
RETURNS TABLE (
  bom_id            uuid,
  raw_material_id   uuid,
  material_name     text,
  material_category text,
  material_type     text,
  required_color    text,
  unit              text,
  stock_quantity    numeric,
  quantity_needed   numeric,
  resolved          boolean,
  is_placeholder    boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH lines AS (
    SELECT
      b.id AS bom_id,
      b.raw_material_id,
      b.material_category,
      b.material_type,
      b.quantity_needed,
      vc.color AS required_color
    FROM public.bill_of_materials b
    JOIN public.product_variants v ON v.product_id = b.product_id
    LEFT JOIN public.variant_cut_colors vc
      ON vc.variant_id = v.id
     AND vc.category   = b.material_category
    WHERE v.id = p_variant_id
  )
  SELECT
    l.bom_id,
    COALESCE(fixed.id, matched.id)                            AS raw_material_id,
    COALESCE(fixed.name, matched.name, l.material_type)       AS material_name,
    COALESCE(fixed.category, l.material_category)             AS material_category,
    COALESCE(fixed.type_specific, l.material_type)            AS material_type,
    l.required_color,
    COALESCE(fixed.unit, matched.unit, 'unidade')             AS unit,
    COALESCE(fixed.stock_quantity, matched.stock_quantity, 0) AS stock_quantity,
    l.quantity_needed,
    (COALESCE(fixed.id, matched.id) IS NOT NULL)              AS resolved,
    COALESCE(pal.is_placeholder, false)                       AS is_placeholder
  FROM lines l
  LEFT JOIN public.raw_materials fixed
    ON fixed.id = l.raw_material_id
  LEFT JOIN public.raw_materials matched
    ON l.raw_material_id IS NULL
   AND matched.category      = l.material_category
   AND matched.type_specific = l.material_type
   AND matched.color IS NOT DISTINCT FROM l.required_color
  LEFT JOIN public.material_colors pal
    ON pal.category = l.material_category
   AND pal.name     = l.required_color;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_variant_bom(uuid) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.pending_cut_materials()
RETURNS TABLE (
  category      text,
  type_specific text,
  color         text,
  variant_count bigint,
  products      text
)
LANGUAGE sql
STABLE
AS $$
  WITH lines AS (
    SELECT
      b.material_category AS category,
      b.material_type     AS type_specific,
      vc.color            AS color,
      p.name              AS product_name
    FROM public.bill_of_materials b
    JOIN public.product_variants v ON v.product_id = b.product_id
    JOIN public.products p         ON p.id = b.product_id
    JOIN public.variant_cut_colors vc
      ON vc.variant_id = v.id
     AND vc.category   = b.material_category
    JOIN public.material_colors mc
      ON mc.category = vc.category
     AND mc.name     = vc.color
    WHERE b.material_category IS NOT NULL
      AND mc.is_placeholder = false   -- "Indefinida" não vira insumo
  )
  SELECT
    l.category,
    l.type_specific,
    l.color,
    count(*)                                                          AS variant_count,
    string_agg(DISTINCT l.product_name, ', ' ORDER BY l.product_name) AS products
  FROM lines l
  LEFT JOIN public.raw_materials rm
    ON rm.category      = l.category
   AND rm.type_specific = l.type_specific
   AND rm.color IS NOT DISTINCT FROM l.color
  WHERE rm.id IS NULL
  GROUP BY l.category, l.type_specific, l.color
  ORDER BY l.category, l.type_specific, l.color;
$$;

GRANT EXECUTE ON FUNCTION public.pending_cut_materials() TO service_role, authenticated;

-- ─── 7. Produção rejeita cor indefinida ──────────────────────────────────────
-- Só o bloco 1 de complete_production_order muda: antes de checar "existe o
-- insumo nessa cor?", checa "a cor foi de fato escolhida?". Sem isso a mensagem
-- de erro seria "insumo não cadastrado", que manda o Henrique cadastrar um
-- corte 'Indefinida' no estoque — exatamente o errado.
CREATE OR REPLACE FUNCTION public.complete_production_order(p_op_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant_id uuid;
  v_status     text;
  v_qty        integer;
  v_missing    text := '';
  v_unresolved text := '';
  v_undefined  text := '';
  r            record;
  v_before     numeric;
  v_after      numeric;
BEGIN
  SELECT product_variant_id, status, quantity_requested
    INTO v_variant_id, v_status, v_qty
    FROM public.production_orders
    WHERE id = p_op_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OP não encontrada';
  END IF;
  IF v_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'OP já está %', v_status;
  END IF;
  IF v_variant_id IS NULL THEN
    RAISE EXCEPTION 'OP sem variante de produto';
  END IF;

  -- 0) A variante precisa ter cor de verdade em toda categoria de corte
  FOR r IN
    SELECT DISTINCT material_category
    FROM public.resolve_variant_bom(v_variant_id)
    WHERE is_placeholder OR (material_category IS NOT NULL AND required_color IS NULL)
  LOOP
    v_undefined := v_undefined || r.material_category || '; ';
  END LOOP;

  IF v_undefined <> '' THEN
    RAISE EXCEPTION 'Defina a cor da variante antes de produzir: %', v_undefined;
  END IF;

  -- 1) Todo item da receita precisa existir na cor da variante
  FOR r IN
    SELECT material_category, material_type, required_color
    FROM public.resolve_variant_bom(v_variant_id)
    WHERE NOT resolved
  LOOP
    v_unresolved := v_unresolved || r.material_category || ' › ' || r.material_type
      || COALESCE(' › ' || r.required_color, '') || '; ';
  END LOOP;

  IF v_unresolved <> '' THEN
    RAISE EXCEPTION 'Insumos não cadastrados na cor desta variante: %', v_unresolved;
  END IF;

  -- 2) Verifica suficiência de TODOS os materiais antes de mexer em qualquer um
  FOR r IN
    SELECT material_name, required_color, unit, stock_quantity,
           (quantity_needed * v_qty) AS needed
    FROM public.resolve_variant_bom(v_variant_id)
  LOOP
    IF r.stock_quantity < r.needed THEN
      v_missing := v_missing || r.material_name
        || COALESCE(' (' || r.required_color || ')', '') || ' — falta '
        || public.format_qty(r.needed - r.stock_quantity) || ' ' || r.unit || '; ';
    END IF;
  END LOOP;

  IF v_missing <> '' THEN
    RAISE EXCEPTION 'Materiais insuficientes: %', v_missing;
  END IF;

  -- 3) Decrementa matérias-primas + registra ajuste
  FOR r IN
    SELECT raw_material_id, stock_quantity, (quantity_needed * v_qty) AS needed
    FROM public.resolve_variant_bom(v_variant_id)
  LOOP
    v_before := r.stock_quantity;
    v_after  := v_before - r.needed;
    UPDATE public.raw_materials
      SET stock_quantity = v_after, updated_at = now()
      WHERE id = r.raw_material_id;
    INSERT INTO public.stock_adjustments
      (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
    VALUES
      ('raw_material', r.raw_material_id, v_before, v_after, -r.needed,
       'producao_concluida', 'OP ' || p_op_id, 'henrique');
  END LOOP;

  -- 4) Incrementa produto acabado + registra ajuste
  SELECT stock_quantity INTO v_before FROM public.product_variants WHERE id = v_variant_id FOR UPDATE;
  v_after := v_before + v_qty;
  UPDATE public.product_variants SET stock_quantity = v_after WHERE id = v_variant_id;
  INSERT INTO public.stock_adjustments
    (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
  VALUES
    ('product_variant', v_variant_id, v_before, v_after, v_qty, 'producao_concluida', 'OP ' || p_op_id, 'henrique');

  -- 5) Conclui a OP
  UPDATE public.production_orders
    SET status = 'completed', quantity_produced = v_qty
    WHERE id = p_op_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_production_order(uuid) TO service_role, authenticated;

-- ─── 8. Só agora as colunas antigas saem ─────────────────────────────────────
ALTER TABLE public.product_variants
  DROP COLUMN IF EXISTS color_lona,
  DROP COLUMN IF EXISTS color_forro,
  DROP COLUMN IF EXISTS color_couro;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 3: Aplicar no Supabase**

Chame `mcp__supabase__apply_migration` com `name = "cut_categories_and_variant_colors"` e o `query` sendo o conteúdo do arquivo acima.

Esperado: sucesso, sem erro. Se falhar em `DROP CONSTRAINT bom_variable_category_check`, confirme o nome real com:

```sql
select conname from pg_constraint where conrelid = 'public.bill_of_materials'::regclass;
```

- [ ] **Step 4: Verificar o backfill**

```sql
select
  (select count(*) from cut_categories)                                as categorias,
  (select count(*) from material_colors)                               as cores,
  (select count(*) from variant_cut_colors)                            as linhas_cor,
  (select count(*) from variant_cut_colors vc
     join material_colors mc on mc.category = vc.category and mc.name = vc.color
    where mc.is_placeholder)                                           as indefinidas,
  (select count(*) from information_schema.columns
    where table_name = 'product_variants' and column_name like 'color_%') as colunas_antigas;
```

Esperado: `categorias = 4`, `cores = 4`, `linhas_cor = 69`, `indefinidas = 69`, `colunas_antigas = 0`.

- [ ] **Step 5: Verificar que a resolução ainda funciona**

```sql
select material_category, required_color, resolved, is_placeholder, count(*)
from product_variants v
cross join lateral resolve_variant_bom(v.id)
where v.id = (select v2.id from product_variants v2
              join bill_of_materials b on b.product_id = v2.product_id
              where b.material_category is not null limit 1)
group by 1,2,3,4 order by 1;
```

Esperado: linhas de corte com `required_color = 'Indefinida'`, `is_placeholder = true`, `resolved = false` (não existe insumo de corte cadastrado). Linhas de cor fixa com `required_color = null`, `is_placeholder = false`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/035_cut_categories_and_variant_colors.sql
git commit -m "feat(db): cores de producao por variante com paleta e Corte Tecido"
```

---

## Task 2: Tipos

**Files:**
- Modify: `lib/types.ts:152-159`

- [ ] **Step 1: Substituir o bloco de categorias**

Em `lib/types.ts`, troque as linhas 151-159 (de `/** Categorias de insumo cuja cor...` até o fim de `MaterialCategory`) por:

```typescript
/**
 * Categoria de insumo cuja cor é definida pela variante.
 *
 * Deixou de ser união literal na migration 035: as categorias vivem em
 * `cut_categories` e uma nova entra por INSERT, sem migration nem deploy.
 * Para saber se uma categoria é de corte, consulte a lista carregada do banco
 * (`getCutCategories`) — não compare com literal em código.
 */
export type CutCategory = string;

/** Uma linha de `cut_categories`. */
export type CutCategoryRow = {
  category: string;
  label: string; // rótulo curto na UI: 'Lona', 'Forro', 'Couro', 'Tecido'
  sort_order: number;
  is_active: boolean;
};

/** Uma cor da paleta, escopada por categoria de corte. */
export type MaterialColor = {
  id: string;
  category: string;
  name: string;
  hex: string | null;
  /** true só na "Indefinida" — marcador de pendência, não uma cor de verdade. */
  is_placeholder: boolean;
  is_active: boolean;
  sort_order: number;
};

/** A cor que uma variante usa numa categoria de corte. */
export type VariantCutColor = {
  category: string;
  color: string;
};

/** Categorias de matéria-prima que não dependem da variante. */
export type FixedMaterialCategory = "Aplicações" | "Metais" | "Aviamentos";
```

- [ ] **Step 2: Conferir que nada usava `MaterialCategory`**

Run: `npx tsc --noEmit 2>&1 | head -30`

Se algum arquivo importava `MaterialCategory`, troque o import para `FixedMaterialCategory` ou `string`, conforme o uso. Espere zero erros ligados a esse tipo (os erros de `color_lona` aparecem nas tasks seguintes e são esperados agora).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "refactor(types): categorias de corte viram dado, nao uniao literal"
```

---

## Task 3: Camada de queries

**Files:**
- Modify: `lib/supabase/admin-queries.ts:5-10` (tipo), `:157-173` (produtos), `:813-845` (compras)

- [ ] **Step 1: Trocar o tipo da variante**

Substitua as linhas 5-10 de `lib/supabase/admin-queries.ts` por:

```typescript
/** Cores de produção da variante — resolvem os cortes da receita do produto. */
export type ProductVariantWithColors = ProductVariant & {
  cut_colors: VariantCutColor[]
}
```

E ajuste o import da linha 3 para incluir os tipos novos:

```typescript
import type {
  ProductWithVariants, ProductVariant, CutCategory,
  CutCategoryRow, MaterialColor, VariantCutColor,
} from '@/lib/types'
```

- [ ] **Step 2: Trazer as cores junto com os produtos**

Em `getAllProductsWithVariants` (linha ~162), troque o `.select(...)` por:

```typescript
    .select(
      '*, variants:product_variants(*, cut_colors:variant_cut_colors(category, color)), bom:bill_of_materials(id, raw_material_id, material_category, material_type, quantity_needed)',
    )
```

- [ ] **Step 3: Adicionar os dois leitores novos**

Logo depois de `getRawMaterials` (após a linha 334), acrescente:

```typescript
/** Categorias de corte ativas, na ordem de exibição. */
export async function getCutCategories(): Promise<CutCategoryRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('cut_categories')
    .select('category, label, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[getCutCategories]', error)
    return []
  }

  return (data ?? []) as CutCategoryRow[]
}

/** Paleta completa. O cliente filtra por categoria na hora de montar o dropdown. */
export async function getMaterialColors(): Promise<MaterialColor[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('material_colors')
    .select('id, category, name, hex, is_placeholder, is_active, sort_order')
    .eq('is_active', true)
    .order('category')
    .order('sort_order')
    .order('name')

  if (error) {
    console.error('[getMaterialColors]', error)
    return []
  }

  return (data ?? []) as MaterialColor[]
}
```

- [ ] **Step 4: Mostrar a cor nas compras**

Em `getPurchaseRequests` (linha ~818), troque o `.select(...)` por:

```typescript
    .select('id, order_id, raw_material_id, material_name, quantity_needed, unit, status, notes, created_at, material:raw_materials(color)')
```

Acrescente `material_color: string | null` ao tipo `PurchaseRequestRow` (depois de `unit`, linha ~806):

```typescript
  unit: string
  /** Cor do insumo referenciado — null nos insumos sem cor. */
  material_color: string | null
```

E no `.map(...)` de retorno (linha ~832), acrescente antes de `status`:

```typescript
      material_color:
        ((r.material as { color: string | null } | null)?.color) ?? null,
```

- [ ] **Step 5: Expor `is_placeholder` na receita resolvida**

`resolve_variant_bom` passou a devolver uma coluna a mais (Task 1). Em
`lib/supabase/bom.ts`, acrescente ao tipo `ResolvedBomLine` (depois de `resolved`,
linha 21):

```typescript
  /** true quando a cor escolhida é a "Indefinida" — pendência, não cor de verdade. */
  is_placeholder: boolean
```

Nada mais muda no arquivo: `normalize` faz spread da linha e só converte os dois
campos numéricos.

Em `lib/supabase/admin-queries.ts`, acrescente o mesmo campo ao tipo `OpMaterial`
(depois de `resolved`, linha ~510):

```typescript
  /** true quando a variante ainda está na cor "Indefinida". */
  is_placeholder: boolean
```

e propague no `.map` que monta `materials` em `getProductionOrders` (linha ~597):

```typescript
        resolved: line.resolved,
        is_placeholder: line.is_placeholder,
```

- [ ] **Step 6: Compilar**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: erros restantes só em `lib/actions/products.ts`, `lib/actions/raw-materials.ts` e `components/admin/produto-modal.tsx` (referências a `color_lona` etc.), resolvidos nas Tasks 5-9.

- [ ] **Step 7: Commit**

```bash
git add lib/supabase/admin-queries.ts lib/supabase/bom.ts
git commit -m "feat(queries): le cut_categories, material_colors e cor nas compras"
```

---

## Task 4: Server action `createMaterialColor`

**Files:**
- Create: `lib/actions/material-colors.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import type { MaterialColor } from '@/lib/types'

export type CreateColorResult =
  | { success: true; color: MaterialColor }
  | { success: false; error: string }

/**
 * Acrescenta uma cor à paleta de uma categoria de corte.
 *
 * É o único caminho de criação: não existe tela de paleta na v1, a cor nasce de
 * dentro do dropdown onde ela vai ser usada. Renomear e desativar ficaram fora
 * de propósito — renomear precisa arrastar junto `raw_materials.color`, que é
 * texto solto, e isso pede uma migration própria.
 */
export async function createMaterialColor(
  category: string,
  name: string,
): Promise<CreateColorResult> {
  await requireAdmin()

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Informe o nome da cor.' }

  const supabase = createServiceClient()

  const { data: known, error: catError } = await supabase
    .from('cut_categories')
    .select('category')
    .eq('category', category)
    .maybeSingle()

  if (catError) return { success: false, error: catError.message }
  if (!known) return { success: false, error: `Categoria desconhecida: ${category}` }

  const { data, error } = await supabase
    .from('material_colors')
    .insert({ category, name: trimmed })
    .select('id, category, name, hex, is_placeholder, is_active, sort_order')
    .single()

  if (error) {
    // 23505 = a UNIQUE (category, name). Acontece quando o Henrique digita uma
    // cor que já existe; dizer "violação de constraint" não ajudaria ninguém.
    if (error.code === '23505') {
      return { success: false, error: `"${trimmed}" já existe nessa categoria.` }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/estoque')
  revalidatePath('/admin/materias')
  return { success: true, color: data as MaterialColor }
}
```

- [ ] **Step 2: Compilar**

Run: `npx tsc --noEmit 2>&1 | grep material-colors`
Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/material-colors.ts
git commit -m "feat(actions): cria cor na paleta a partir do dropdown"
```

---

## Task 5: Persistência e validação das cores da variante

**Files:**
- Modify: `lib/actions/products.ts:113-125` (tipo), `:205-229` (update), `:300-315` (create)

- [ ] **Step 1: Trocar o formato de `VariantInput`**

Substitua o bloco `export type VariantInput = {...}` (linhas 113-125) por:

```typescript
export type VariantInput = {
  tempId: string // chave estável do client, sempre presente
  id?: string // presente se a variante já existe no banco
  color: string | null
  size: string | null
  sku: string
  stock_quantity: number
  images: string[]
  /**
   * Cor de produção por categoria de corte: { 'Corte Lona': 'Mostarda', ... }.
   * Precisa cobrir toda categoria que a receita do produto usa — o servidor
   * recusa se faltar, mesmo que o cliente tenha deixado passar.
   */
  cut_colors: Record<string, string>
}
```

- [ ] **Step 2: Escrever o helper de persistência**

Acrescente logo depois de `saveProductBom` (após a linha 150):

```typescript
/** Categorias de corte que a receita exige — ou seja, que a variante deve colorir. */
function requiredCategories(bom: ProductBomInput[]): string[] {
  return Array.from(
    new Set(
      bom
        .map((b) => b.material_category)
        .filter((c): c is string => Boolean(c)),
    ),
  )
}

/**
 * Grava as cores de produção da variante.
 *
 * Recusa se faltar cor de alguma categoria exigida pela receita. A checagem é
 * repetida aqui (o modal já valida) porque server action é superfície pública:
 * qualquer cliente pode chamar direto.
 */
async function saveVariantCutColors(
  supabase: ReturnType<typeof createServiceClient>,
  variantId: string,
  cutColors: Record<string, string>,
  required: string[],
  sku: string,
): Promise<void> {
  const missing = required.filter((c) => !cutColors[c]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Variante ${sku}: defina a cor de ${missing.join(', ')} antes de salvar.`,
    )
  }

  const { error: delError } = await supabase
    .from('variant_cut_colors')
    .delete()
    .eq('variant_id', variantId)
  if (delError) throw new Error(delError.message)

  const rows = required.map((category) => ({
    variant_id: variantId,
    category,
    color: cutColors[category].trim(),
  }))

  if (rows.length === 0) return

  const { error: insError } = await supabase.from('variant_cut_colors').insert(rows)
  if (insError) {
    // 23503 = a FK composta para material_colors: cor que não está na paleta.
    if (insError.code === '23503') {
      throw new Error(
        `Variante ${sku}: uma das cores não existe na paleta. Recarregue a página e escolha de novo.`,
      )
    }
    throw new Error(insError.message)
  }
}
```

- [ ] **Step 3: Usar o helper em `updateProduct`**

Substitua o laço `for (const v of data.variants) {...}` (linhas 205-229) por:

```typescript
  const required = requiredCategories(data.bom)

  for (const v of data.variants) {
    const fields = {
      color: v.color,
      size: v.size,
      sku: v.sku,
      stock_quantity: v.stock_quantity,
      images: v.images,
    }

    let variantId = v.id

    if (variantId) {
      const { error: varError } = await supabase
        .from('product_variants')
        .update(fields)
        .eq('id', variantId)
      if (varError) throw new Error(varError.message)
    } else {
      const { data: created, error: insError } = await supabase
        .from('product_variants')
        .insert({ product_id: productId, ...fields })
        .select('id')
        .single()
      if (insError) throw new Error(insError.message)
      variantId = created.id as string
    }

    await saveVariantCutColors(supabase, variantId, v.cut_colors, required, v.sku)
  }
```

- [ ] **Step 4: Usar o helper em `createProduct`**

Substitua o laço `for (const v of data.variants) {...}` (linhas 300-315) por:

```typescript
  const required = requiredCategories(data.bom)

  for (const v of data.variants) {
    const { data: created, error: varError } = await supabase
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

    await saveVariantCutColors(supabase, created.id as string, v.cut_colors, required, v.sku)
  }
```

- [ ] **Step 5: Compilar**

Run: `npx tsc --noEmit 2>&1 | grep "actions/products"`
Expected: nenhuma saída.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/products.ts
git commit -m "feat(products): cor de producao obrigatoria por categoria da receita"
```

---

## Task 6: Tirar a lista de categorias do código

**Files:**
- Modify: `lib/actions/raw-materials.ts:12-13`, `:156-193`

- [ ] **Step 1: Remover a constante hardcoded**

Apague as linhas 12-13:

```typescript
/** Categorias cuja cor é definida pela variante, não pela receita. */
const CUT_CATEGORIES: readonly CutCategory[] = ['Corte Lona', 'Corte Forro', 'Corte Couro']
```

E o import de `CutCategory` na linha 6 (`import type { CutCategory } from '@/lib/types'`), que fica sem uso.

- [ ] **Step 2: Perguntar ao banco em `addBOMEntry`**

Em `addBOMEntry`, substitua a linha `const isCut = CUT_CATEGORIES.includes(material.category as CutCategory)` por:

```typescript
  // Se a categoria está em cut_categories, a cor vem da variante e a receita
  // guarda só (categoria, tipo). Consultar em vez de comparar com literal deixa
  // categoria nova (ex: Corte Tecido) funcionar sem deploy.
  const { data: cutCategory } = await supabase
    .from('cut_categories')
    .select('category')
    .eq('category', material.category)
    .maybeSingle()

  const isCut = Boolean(cutCategory)
```

- [ ] **Step 3: Compilar**

Run: `npx tsc --noEmit 2>&1 | grep raw-materials`
Expected: nenhuma saída.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/raw-materials.ts
git commit -m "refactor(raw-materials): categoria de corte vem do banco"
```

---

## Task 7: Componente `ColorSelect`

**Files:**
- Create: `components/admin/color-select.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
"use client"

// Client component: mantém o estado do campo "nova cor" e chama a server action
// sem recarregar o modal do produto, que perderia tudo que estava preenchido.

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { createMaterialColor } from '@/lib/actions/material-colors'
import type { MaterialColor } from '@/lib/types'

const NEW_COLOR_VALUE = '__nova__'

interface ColorSelectProps {
  category: string
  colors: MaterialColor[]
  value: string
  onChange: (color: string) => void
  /** Chamado quando uma cor nova nasce, para o pai somar à paleta em memória. */
  onColorCreated: (color: MaterialColor) => void
  testId: string
}

/**
 * Dropdown da paleta de uma categoria, com criação de cor embutida.
 *
 * A "Indefinida" (placeholder) só aparece se a variante já estiver nela — é
 * marcador de pendência vindo do backfill, não uma opção de preenchimento.
 */
export function ColorSelect({
  category,
  colors,
  value,
  onChange,
  onColorCreated,
  testId,
}: ColorSelectProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const options = colors.filter((c) => !c.is_placeholder || c.name === value)
  const isUndefined = colors.some((c) => c.name === value && c.is_placeholder)

  async function handleCreate() {
    const name = newName.trim()
    if (!name) { setError('Informe o nome da cor.'); return }

    setSaving(true)
    setError(null)
    const result = await createMaterialColor(category, name)
    setSaving(false)

    if (!result.success) { setError(result.error); return }

    onColorCreated(result.color)
    onChange(result.color.name)
    setNewName('')
    setCreating(false)
  }

  if (creating) {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            className="input"
            autoFocus
            data-testid={`${testId}-nova`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
            placeholder="Nome da cor"
          />
          <button className="btn sm primary" type="button" onClick={handleCreate} disabled={saving}>
            {saving ? '…' : 'Salvar'}
          </button>
          <button
            className="icon-btn"
            type="button"
            title="Cancelar"
            onClick={() => { setCreating(false); setNewName(''); setError(null) }}
          >
            <AdminIcon name="x" size={11} />
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: 'var(--red)' }}>{error}</div>}
      </div>
    )
  }

  return (
    <select
      className="select"
      data-testid={testId}
      value={value}
      style={isUndefined ? { borderColor: 'var(--amber, #b45309)' } : undefined}
      onChange={(e) => {
        if (e.target.value === NEW_COLOR_VALUE) { setCreating(true); return }
        onChange(e.target.value)
      }}
    >
      <option value="">Escolha a cor…</option>
      {options.map((c) => (
        <option key={c.id} value={c.name}>
          {c.is_placeholder ? `${c.name} (pendente)` : c.name}
        </option>
      ))}
      <option value={NEW_COLOR_VALUE}>+ Nova cor…</option>
    </select>
  )
}
```

- [ ] **Step 2: Compilar**

Run: `npx tsc --noEmit 2>&1 | grep color-select`
Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add components/admin/color-select.tsx
git commit -m "feat(admin): dropdown de cor com criacao inline"
```

---

## Task 8: Componente `VariantRecipe`

**Files:**
- Create: `components/admin/variant-recipe.tsx`

Resolve a receita **no cliente**: o modal já carrega `rawMaterials` inteiro, então dá para casar `(category, type_specific, color)` sem ida ao servidor — e funciona em produto ainda não salvo, onde `resolve_variant_bom` não teria o que ler.

- [ ] **Step 1: Criar o componente**

```tsx
"use client"

// Client component: reage à troca de cor no dropdown recalculando o estoque de
// cada peça na hora, sem round-trip.

import { AdminIcon } from '@/components/admin/admin-icon'
import { ColorSelect } from '@/components/admin/color-select'
import type { CutCategoryRow, MaterialColor } from '@/lib/types'
import type { RawMaterialRow } from '@/lib/supabase/admin-queries'

/** Uma linha da receita do produto, como o modal a mantém em memória. */
export type RecipeLine = {
  raw_material_id: string | null
  material_category: string
  material_type: string
  quantity_needed: string
}

interface VariantRecipeProps {
  bom: RecipeLine[]
  cutCategories: CutCategoryRow[]
  colors: MaterialColor[]
  rawMaterials: RawMaterialRow[]
  /** Cor escolhida por categoria nesta variante. */
  cutColors: Record<string, string>
  onCutColorChange: (category: string, color: string) => void
  onColorCreated: (color: MaterialColor) => void
  variantKey: string
}

type LineStatus =
  | { kind: 'ok'; stock: number; unit: string }
  | { kind: 'short'; stock: number; unit: string }
  | { kind: 'unregistered' }
  | { kind: 'no-color' }

function resolveLine(
  line: RecipeLine,
  color: string | undefined,
  isCut: boolean,
  rawMaterials: RawMaterialRow[],
): LineStatus {
  const needed = parseFloat(line.quantity_needed) || 0

  if (isCut) {
    if (!color) return { kind: 'no-color' }
    const match = rawMaterials.find(
      (m) =>
        m.category === line.material_category &&
        (m.type_specific ?? m.name) === line.material_type &&
        m.color === color,
    )
    if (!match) return { kind: 'unregistered' }
    return {
      kind: match.stock_quantity >= needed ? 'ok' : 'short',
      stock: match.stock_quantity,
      unit: match.unit,
    }
  }

  const fixed = rawMaterials.find((m) => m.id === line.raw_material_id)
  if (!fixed) return { kind: 'unregistered' }
  return {
    kind: fixed.stock_quantity >= needed ? 'ok' : 'short',
    stock: fixed.stock_quantity,
    unit: fixed.unit,
  }
}

function StatusCell({ status }: { status: LineStatus }) {
  if (status.kind === 'no-color') {
    return <span style={{ color: 'var(--text-3)' }}>escolha a cor</span>
  }
  if (status.kind === 'unregistered') {
    return <span style={{ color: 'var(--amber, #b45309)' }}>não cadastrado nesta cor</span>
  }
  const color = status.kind === 'ok' ? 'var(--green)' : 'var(--red)'
  return (
    <span style={{ color }}>
      {status.stock} {status.unit} em estoque
    </span>
  )
}

/**
 * A receita da variante: as linhas vêm da receita do produto, e as de corte
 * ganham cor e saldo concretos. A cor é escolhida por CATEGORIA, não por peça —
 * uma variante tem uma cor de lona que vale para as 12 peças de lona dela.
 */
export function VariantRecipe({
  bom,
  cutCategories,
  colors,
  rawMaterials,
  cutColors,
  onCutColorChange,
  onColorCreated,
  variantKey,
}: VariantRecipeProps) {
  if (bom.length === 0) {
    return (
      <div className="cust-meta">
        Cadastre a receita acima; ela vale para todas as variantes.
      </div>
    )
  }

  const cutSet = new Set(cutCategories.map((c) => c.category))
  const categories = Array.from(new Set(bom.map((b) => b.material_category)))
  const ordered = [
    ...cutCategories.map((c) => c.category).filter((c) => categories.includes(c)),
    ...categories.filter((c) => !cutSet.has(c)).sort(),
  ]

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 500 }}>
        Receita desta variante{' '}
        <span className="cust-meta">· herdada do produto ({bom.length} itens)</span>
      </div>

      {ordered.map((category) => {
        const lines = bom.filter((b) => b.material_category === category)
        const isCut = cutSet.has(category)
        const chosen = cutColors[category] ?? ''

        return (
          <div
            key={category}
            style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', background: 'var(--surface-2)',
              }}
            >
              <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{category}</div>
              {isCut ? (
                <div style={{ width: 200 }}>
                  <ColorSelect
                    category={category}
                    colors={colors.filter((c) => c.category === category)}
                    value={chosen}
                    onChange={(c) => onCutColorChange(category, c)}
                    onColorCreated={onColorCreated}
                    testId={`select-cor-${category.replace(/\s+/g, '-').toLowerCase()}-${variantKey}`}
                  />
                </div>
              ) : (
                <div className="cust-meta">cor fixa</div>
              )}
              <div className="cust-meta" style={{ width: 70, textAlign: 'right' }}>
                {lines.length} {lines.length === 1 ? 'item' : 'itens'}
              </div>
            </div>

            <table className="tbl" style={{ fontSize: 11.5 }}>
              <tbody>
                {lines.map((line) => {
                  const status = resolveLine(line, chosen || undefined, isCut, rawMaterials)
                  return (
                    <tr key={`${line.material_category}-${line.material_type}-${line.raw_material_id ?? ''}`}>
                      <td style={{ padding: '3px 10px' }}>{line.material_type}</td>
                      <td style={{ padding: '3px 10px', width: 70 }} className="cust-meta">
                        {line.quantity_needed} un
                      </td>
                      <td style={{ padding: '3px 10px', width: 190 }}>
                        <StatusCell status={status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      {ordered.some((c) => cutSet.has(c) && !cutColors[c]) && (
        <div style={{ fontSize: 11.5, color: 'var(--red)', display: 'flex', gap: 4 }}>
          <AdminIcon name="x" size={11} />
          Defina a cor de todas as categorias de corte para salvar.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Compilar**

Run: `npx tsc --noEmit 2>&1 | grep variant-recipe`
Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add components/admin/variant-recipe.tsx
git commit -m "feat(admin): receita resolvida dentro do card da variante"
```

---

## Task 9: Reordenar e religar o modal do produto

**Files:**
- Modify: `components/admin/produto-modal.tsx`

- [ ] **Step 1: Trocar imports e props**

No topo do arquivo, acrescente aos imports:

```typescript
import { VariantRecipe, type RecipeLine } from '@/components/admin/variant-recipe'
import type { CutCategoryRow, MaterialColor } from '@/lib/types'
```

Troque a interface de props (linha ~105):

```typescript
interface ProdutoModalProps {
  mode: 'create' | 'edit'
  product?: ProductWithVariantsAndBom
  rawMaterials: RawMaterialRow[]
  cutCategories: CutCategoryRow[]
  materialColors: MaterialColor[]
  onClose: () => void
}
```

E a assinatura do componente (linha ~112):

```typescript
export function ProdutoModal({
  mode, product, rawMaterials, cutCategories, materialColors, onClose,
}: ProdutoModalProps) {
```

- [ ] **Step 2: Trocar as três strings de cor por um mapa**

Em `VariantRow` (linha ~64), remova `colorLona`, `colorForro`, `colorCouro` e ponha:

```typescript
  cutColors: Record<string, string>
```

Em `emptyVariant` (linha ~80), remova as três linhas `colorLona: ''` etc. e ponha:

```typescript
    cutColors: {},
```

Na inicialização do estado `variants` (linha ~140), troque as três linhas `colorLona: v.color_lona ?? ''` etc. por:

```typescript
          cutColors: Object.fromEntries(
            (v.cut_colors ?? []).map((c) => [c.category, c.color]),
          ),
```

- [ ] **Step 3: Tornar a paleta editável em memória**

Logo depois do estado `bom` (linha ~174), acrescente:

```typescript
  // A paleta cresce sem fechar o modal quando o Henrique cria uma cor.
  const [colors, setColors] = useState<MaterialColor[]>(materialColors)

  function handleColorCreated(color: MaterialColor) {
    setColors((prev) => [...prev, color])
  }

  function setCutColor(tempId: string, category: string, color: string) {
    setVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId ? { ...v, cutColors: { ...v.cutColors, [category]: color } } : v,
      ),
    )
  }

  // Categorias de corte que a receita exige — é o que cada variante deve colorir.
  const cutCategorySet = new Set(cutCategories.map((c) => c.category))
  const requiredCategories = Array.from(
    new Set(bom.map((b) => b.material_category).filter((c) => cutCategorySet.has(c))),
  )

  const recipeLines: RecipeLine[] = bom.map((b) => ({
    raw_material_id: b.raw_material_id,
    material_category: b.material_category,
    material_type: b.material_type,
    quantity_needed: b.quantity_needed,
  }))
```

- [ ] **Step 4: Substituir `isCutCategory` pela lista do banco**

Remova a constante `CUT_CATEGORIES` e a função `isCutCategory` (linhas 41-45) e, no lugar, use `cutCategorySet.has(...)`. Como `bomKey` e `availableMaterials` estão fora do componente ou dependem dela, mova `bomKey` para dentro do componente e troque a chamada:

```typescript
  function bomKey(category: string, type: string | null, id: string | null): string {
    return cutCategorySet.has(category) ? `${category}||${type ?? ''}` : (id ?? '')
  }
```

Nas três outras chamadas de `isCutCategory(...)` — em `availableMaterials` (linha ~240), `addBomRow` (linha ~251), no `map` de `bomInputs` (linha ~311) e na tabela da receita (linha ~665) — troque por `cutCategorySet.has(...)`.

- [ ] **Step 5: Validar no submit**

Em `handleSubmit`, logo depois da checagem de SKU (linha ~276), acrescente:

```typescript
    const semCor = variants.find((v) =>
      requiredCategories.some((c) => !v.cutColors[c]?.trim()),
    )
    if (semCor) {
      const faltando = requiredCategories.filter((c) => !semCor.cutColors[c]?.trim())
      setError(
        `Variante "${variantSummary(semCor)}": defina a cor de ${faltando.join(', ')}.`,
      )
      return
    }
```

E no `variantInputs.push({...})` (linha ~296), troque as três linhas `color_lona: ...` por:

```typescript
          cut_colors: v.cutColors,
```

- [ ] **Step 6: Mover a Receita para antes das Variantes**

No JSX, recorte o bloco inteiro `{/* Receita do produto — uma só... */}` (linhas ~643-715) e cole **antes** do bloco `{/* Variantes */}` (linha ~521). Ajuste o rótulo para deixar a herança explícita:

```tsx
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Receita padrão — herdada por todas as {variants.length}{' '}
              {variants.length === 1 ? 'variante' : 'variantes'}
            </label>
```

- [ ] **Step 7: Trocar as 3 caixas de cor pelo bloco de receita**

Dentro do card da variante, substitua todo o bloco `{/* Cores de produção — resolvem os cortes... */}` (linhas ~599-633) por:

```tsx
                        <VariantRecipe
                          bom={recipeLines}
                          cutCategories={cutCategories}
                          colors={colors}
                          rawMaterials={rawMaterials}
                          cutColors={v.cutColors}
                          onCutColorChange={(cat, color) => setCutColor(v.tempId, cat, color)}
                          onColorCreated={handleColorCreated}
                          variantKey={v.tempId}
                        />
```

Remova também o `<datalist id="cores-insumos">` (linhas ~717-721) e a constante `knownColors` (linha ~244), que ficam sem uso.

- [ ] **Step 8: Compilar**

Run: `npx tsc --noEmit 2>&1 | grep produto-modal`
Expected: nenhuma saída.

- [ ] **Step 9: Commit**

```bash
git add components/admin/produto-modal.tsx
git commit -m "feat(admin): receita antes das variantes e cor obrigatoria no card"
```

---

## Task 10: Coluna Cor nas três abas de matérias-primas

**Files:**
- Modify: `components/admin/materias-client.tsx:386-393` (Insumos), `:588-596` (Receitas), `:742-751` (Compras)

- [ ] **Step 1: Insumos — coluna Cor**

No `<thead>` da tabela de insumos (linha ~386), acrescente depois de `<th>Nome</th>`:

```tsx
                    <th style={{ width: 90 }}>Cor</th>
```

E na linha correspondente do `<tbody>`, acrescente a célula na mesma posição:

```tsx
                      <td className="cust-meta">{m.color ?? '—'}</td>
```

- [ ] **Step 2: Receitas — seletor de variante**

Acima da tabela de receita de cada produto (antes do `<thead>` da linha ~588), acrescente o seletor. Ele precisa de estado no componente:

```tsx
  // Qual variante "colore" a receita exibida. Chave: product id.
  const [recipeVariant, setRecipeVariant] = useState<Record<string, string>>({})
```

E o controle, logo antes da tabela:

```tsx
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className="cust-meta">ver como:</span>
                    <select
                      className="select"
                      style={{ width: 220, height: 26 }}
                      data-testid={`select-variante-receita-${p.id}`}
                      value={recipeVariant[p.id] ?? ''}
                      onChange={(e) =>
                        setRecipeVariant((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    >
                      <option value="">Receita padrão (sem cor)</option>
                      {(p.variants ?? []).map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  </div>
```

No `<thead>` (linha ~590), acrescente depois de `<th>Material</th>`:

```tsx
                      <th style={{ width: 110 }}>Cor</th>
```

E na linha do corpo, a célula: mostra a cor da variante escolhida nos cortes, e a cor própria do insumo nos demais.

```tsx
                        <td className="cust-meta">
                          {b.is_cut
                            ? (variantColors[b.material_category] ?? 'cor da variante')
                            : '—'}
                        </td>
```

Onde `variantColors` vem do id selecionado:

```tsx
                  const selectedId = recipeVariant[p.id] ?? ''
                  const variantColors: Record<string, string> = Object.fromEntries(
                    ((p.variants ?? []).find((v) => v.id === selectedId)?.cut_colors ?? [])
                      .map((c) => [c.category, c.color]),
                  )
```

- [ ] **Step 3: Estender `ProductWithBOM` para carregar as variantes**

Em `lib/supabase/admin-queries.ts`, acrescente ao tipo `ProductWithBOM` (linha ~358):

```typescript
  variants: Array<{ id: string; label: string; cut_colors: VariantCutColor[] }>
```

Em `getAllProductsWithBOM`, troque `variants:product_variants(id)` (linha ~398) por:

```typescript
      variants:product_variants(id, sku, size, color, cut_colors:variant_cut_colors(category, color)),
```

Ajuste o tipo `Raw` (linha ~435) e o retorno (linha ~450) para montar o rótulo:

```typescript
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      label: [v.color, v.size !== 'Único' ? v.size : null].filter(Boolean).join(' — ') || v.sku,
      cut_colors: v.cut_colors ?? [],
    })),
    variant_count: (p.variants ?? []).length,
```

Com o tipo `Raw` correspondente:

```typescript
    variants: Array<{
      id: string; sku: string; size: string | null; color: string | null
      cut_colors: Array<{ category: string; color: string }>
    }>
```

- [ ] **Step 4: Aviso de variante sem cor na aba Receitas**

Logo depois do seletor, acrescente:

```tsx
                  {(() => {
                    const exigidas = Array.from(
                      new Set(p.bom.filter((b) => b.is_cut).map((b) => b.material_category)),
                    )
                    const pendentes = (p.variants ?? []).filter((v) =>
                      exigidas.some((c) => !v.cut_colors.some((cc) => cc.category === c)),
                    )
                    if (pendentes.length === 0) return null
                    return (
                      <div style={{ fontSize: 11.5, color: 'var(--amber, #b45309)', marginBottom: 6 }}>
                        {pendentes.length}{' '}
                        {pendentes.length === 1 ? 'variante sem cor' : 'variantes sem cor'} —
                        defina em Estoque › {p.name}.
                      </div>
                    )
                  })()}
```

- [ ] **Step 5: "Nova matéria-prima" — cor vira dropdown da paleta**

Hoje o campo Cor do formulário é `<input>` livre (`newColor`, usado em
`createRawMaterial` na linha ~310). Texto livre aqui é exatamente o que quebra o
casamento com `variant_cut_colors`: a variante escolhe da paleta, o insumo é
digitado à mão, e um acento de diferença separa os dois para sempre.

Troque o `<input>` de cor por:

```tsx
                {isCutCategory(newCategory) && (
                  <div className="field">
                    <label>Cor *</label>
                    <ColorSelect
                      category={newCategory}
                      colors={materialColors.filter((c) => c.category === newCategory)}
                      value={newColor}
                      onChange={setNewColor}
                      onColorCreated={(c) => setMaterialColorList((prev) => [...prev, c])}
                      testId="select-cor-nova-materia"
                    />
                  </div>
                )}
```

com, no topo do componente:

```typescript
import { ColorSelect } from '@/components/admin/color-select'
import type { MaterialColor } from '@/lib/types'

  const [materialColorList, setMaterialColorList] = useState<MaterialColor[]>(materialColors)
```

`isCutCategory` aqui passa a ser `cutCategories.some((c) => c.category === newCategory)`.
`materialColors` e `cutCategories` entram como props novas do `MateriasClient`, vindas
da página (Task 11).

Acrescente a validação no submit, junto das que já existem (linha ~300):

```typescript
    if (isCutCategory(newCategory) && !newColor.trim()) {
      setNewError('Insumo de corte precisa de cor.')
      return
    }
```

- [ ] **Step 6: Compras — coluna Cor**

No `<thead>` (linha ~744), acrescente depois de `<th>Material</th>`:

```tsx
                    <th style={{ width: 90 }}>Cor</th>
```

E a célula correspondente no corpo:

```tsx
                    <td className="cust-meta">{pr.material_color ?? '—'}</td>
```

- [ ] **Step 7: Compilar**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: nenhuma saída.

- [ ] **Step 8: Commit**

```bash
git add components/admin/materias-client.tsx lib/supabase/admin-queries.ts
git commit -m "feat(materias): coluna de cor nas 3 abas e seletor de variante na receita"
```

---

## Task 11: Ligar as páginas

**Files:**
- Modify: `app/admin/estoque/page.tsx`, `app/admin/materias/page.tsx`, `components/admin/estoque-client.tsx`

- [ ] **Step 1: Página de estoque**

Substitua o conteúdo de `app/admin/estoque/page.tsx` por:

```tsx
import {
  getAllProductsWithVariants,
  getRawMaterials,
  getCutCategories,
  getMaterialColors,
} from '@/lib/supabase/admin-queries'
import { EstoqueClient } from '@/components/admin/estoque-client'

export default async function EstoquePage() {
  const [products, rawMaterials, cutCategories, materialColors] = await Promise.all([
    getAllProductsWithVariants(),
    getRawMaterials(),
    getCutCategories(),
    getMaterialColors(),
  ])
  return (
    <EstoqueClient
      products={products}
      rawMaterials={rawMaterials}
      cutCategories={cutCategories}
      materialColors={materialColors}
    />
  )
}
```

- [ ] **Step 2: Repassar no `EstoqueClient`**

Em `components/admin/estoque-client.tsx`, acrescente às props do componente:

```typescript
  cutCategories: CutCategoryRow[]
  materialColors: MaterialColor[]
```

com o import `import type { CutCategoryRow, MaterialColor } from '@/lib/types'`, e repasse as duas para cada uso de `<ProdutoModal ... />`.

- [ ] **Step 3: Página de matérias-primas**

O formulário "Nova matéria-prima" (Task 10, Step 5) precisa da paleta. Substitua o conteúdo de `app/admin/materias/page.tsx` por:

```tsx
import {
  getRawMaterials, getAllProductsWithBOM, getPurchaseRequests, getPendingCutMaterials,
  getCutCategories, getMaterialColors,
} from '@/lib/supabase/admin-queries'
import { getSuppliers } from '@/lib/actions/suppliers'
import { MateriasClient } from '@/components/admin/materias-client'

export const dynamic = 'force-dynamic'

export default async function MateriasPage() {
  const [materials, products, purchaseRequests, suppliers, pendingCuts, cutCategories, materialColors] =
    await Promise.all([
      getRawMaterials(),
      getAllProductsWithBOM(),
      getPurchaseRequests(),
      getSuppliers(),
      getPendingCutMaterials(),
      getCutCategories(),
      getMaterialColors(),
    ])

  return (
    <MateriasClient
      materials={materials}
      products={products}
      pendingCuts={pendingCuts}
      purchaseRequests={purchaseRequests}
      suppliers={suppliers}
      cutCategories={cutCategories}
      materialColors={materialColors}
    />
  )
}
```

E acrescente `cutCategories: CutCategoryRow[]` e `materialColors: MaterialColor[]` às props de `MateriasClient`.

- [ ] **Step 4: Build completo**

Run: `npx tsc --noEmit`
Expected: sem saída.

Run: `npm run build`
Expected: chega em "Compiled successfully". Erros de conexão com Supabase durante a coleta de páginas são esperados neste ambiente (não há env) e **não** contam como falha — o que importa é a compilação passar. Se o build falhar antes de "Compiled successfully", é erro de verdade.

- [ ] **Step 5: Commit**

```bash
git add app/admin/estoque/page.tsx app/admin/materias/page.tsx components/admin/estoque-client.tsx
git commit -m "feat(admin): paginas passam paleta e categorias de corte"
```

---

## Task 12: Teste e2e e verificação final

**Files:**
- Modify: `e2e/produto-modal.spec.ts`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao fim de `e2e/produto-modal.spec.ts`:

```typescript
test('não salva variante sem a cor exigida pela receita', async ({ page }) => {
  await loginAsAdmin(page)

  await page.goto('/admin/estoque')
  await page.locator('#btn-novo-produto').click()

  await page.locator('[data-testid="input-nome-produto"]').fill(`Cor Obrigatoria ${Date.now()}`)
  await page.locator('.modal .field:has-text("Preço varejo") input').fill('50,00')

  // Põe um corte na receita: é isso que passa a exigir cor na variante.
  const bomSelect = page.locator('[data-testid="select-bom-material"]')
  const cutOption = bomSelect.locator('option', { hasText: 'Corte ' }).first()
  test.skip(await cutOption.count() === 0, 'sem insumo de corte cadastrado no ambiente')
  await bomSelect.selectOption({ label: (await cutOption.textContent()) ?? '' })

  const variantCard = page.locator('.modal').locator('div', { hasText: 'Nova variante' }).first()
  await variantCard.click()
  await page.locator('.modal input[placeholder="BOL-TIRA-MAR-UNI"]').first().fill(`SKU-COR-${Date.now()}`)

  // Salva sem escolher cor nenhuma
  await page.locator('#btn-salvar-produto').click()

  await expect(page.locator('.modal')).toContainText('defina a cor', { ignoreCase: true })
})
```

- [ ] **Step 2: Corrigir o seletor do teste que já existia**

O teste atual usa `[data-testid^="select-bom-material-"]` (com hífen final), mas o componente expõe `data-testid="select-bom-material"` — o seletor nunca casa e o bloco de BOM é silenciosamente pulado. Troque a linha 28 de `e2e/produto-modal.spec.ts` por:

```typescript
  const bomSelect = page.locator('[data-testid="select-bom-material"]').first()
```

- [ ] **Step 3: Rodar a suíte**

Run: `npm run test:e2e -- produto-modal`

Expected neste ambiente: **falha por não conseguir subir o app** (sem env do Supabase). Isso é esperado e não deve ser "consertado" mexendo no teste. Registre a saída e siga.

Quem roda de verdade é o Leonardo, com env configurado.

- [ ] **Step 4: Verificação final no banco**

```sql
select
  (select count(*) from cut_categories where category = 'Corte Tecido')  as tecido_existe,
  (select count(*) from variant_cut_colors)                              as linhas_cor,
  (select count(*) from variant_cut_colors vc
     join material_colors mc on mc.category = vc.category and mc.name = vc.color
    where mc.is_placeholder)                                             as pendentes,
  (select count(*) from pending_cut_materials())                         as cortes_a_cadastrar;
```

Esperado: `tecido_existe = 1`, `linhas_cor = 69`, `pendentes = 69`, `cortes_a_cadastrar = 0` (nenhuma cor real escolhida ainda, e "Indefinida" é ignorada de propósito).

- [ ] **Step 5: Commit**

```bash
git add e2e/produto-modal.spec.ts
git commit -m "test(e2e): variante nao salva sem a cor exigida pela receita"
```

---

## Task 13: Dropdown da receita lista cortes e cria insumo inline

**Files:**
- Modify: `lib/supabase/admin-queries.ts` (novo `getRecipeMaterialOptions`)
- Create: `lib/actions/recipe-materials.ts`
- Create: `components/admin/material-select.tsx`
- Modify: `components/admin/produto-modal.tsx`

**Por que entrou no plano.** O seletor "+ Adicionar insumo…" monta as opções a partir de
`raw_materials`, onde não existe **nenhum** corte — os 70 itens de corte dos 5 produtos
vieram do seed da migration 031. Sem isso, a receita de um produto novo não consegue
receber corte nenhum, e a feature inteira nasce travada.

A correção tem duas partes, ambas pedidas pelo Leonardo: puxar os cortes de
`bill_of_materials` (onde os 35 tipos já estão) e permitir criar um insumo de dentro do
dropdown, no mesmo gesto do `+ Nova cor`.

- [ ] **Step 1: Query das opções**

Em `lib/supabase/admin-queries.ts`, acrescente:

```typescript
/** Uma opção do seletor de insumo da receita. */
export type RecipeMaterialOption = {
  /** id de raw_materials nos de cor fixa; null nos cortes. */
  raw_material_id: string | null
  category: string
  type: string
  unit: string
  is_cut: boolean
}

/**
 * Opções do seletor "+ Adicionar insumo" da receita.
 *
 * Cortes NÃO saem de raw_materials: lá o insumo é por (peça, cor), e a receita
 * quer a peça sem cor. Saem dos tipos já usados em qualquer receita — é o que
 * torna as 35 peças do seed reusáveis num produto novo.
 */
export async function getRecipeMaterialOptions(): Promise<RecipeMaterialOption[]> {
  const supabase = createServiceClient()

  const [fixedRes, cutRes] = await Promise.all([
    supabase
      .from('raw_materials')
      .select('id, category, type_specific, name, unit')
      .not('category', 'in', '("Corte Lona","Corte Forro","Corte Couro","Corte Tecido")')
      .order('category')
      .order('name'),
    supabase
      .from('bill_of_materials')
      .select('material_category, material_type')
      .not('material_category', 'is', null),
  ])

  if (fixedRes.error) console.error('[getRecipeMaterialOptions:fixed]', fixedRes.error)
  if (cutRes.error) console.error('[getRecipeMaterialOptions:cut]', cutRes.error)

  const fixed: RecipeMaterialOption[] = (fixedRes.data ?? []).map((m) => ({
    raw_material_id: m.id as string,
    category: m.category as string,
    type: (m.type_specific as string | null) ?? (m.name as string),
    unit: m.unit as string,
    is_cut: false,
  }))

  const seen = new Set<string>()
  const cuts: RecipeMaterialOption[] = []
  for (const row of cutRes.data ?? []) {
    const category = row.material_category as string
    const type = row.material_type as string
    const key = `${category}||${type}`
    if (seen.has(key)) continue
    seen.add(key)
    cuts.push({ raw_material_id: null, category, type, unit: 'unidade', is_cut: true })
  }
  cuts.sort((a, b) => a.category.localeCompare(b.category) || a.type.localeCompare(b.type))

  return [...cuts, ...fixed]
}
```

- [ ] **Step 2: Server action de criação**

Crie `lib/actions/recipe-materials.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/server/auth'
import type { RecipeMaterialOption } from '@/lib/supabase/admin-queries'

export type CreateRecipeMaterialResult =
  | { success: true; option: RecipeMaterialOption }
  | { success: false; error: string }

/**
 * Cria um insumo a partir do seletor da receita.
 *
 * Categoria de corte: nada é gravado em raw_materials — no momento da receita
 * ainda não se sabe a cor, e o estoque de corte é por (peça, cor). A opção volta
 * só para o cliente montar a linha da receita; as linhas de estoque nascem
 * depois, pelo botão de cortes pendentes, quando a variante já escolheu a cor.
 *
 * Categoria de cor fixa: cria a linha em raw_materials com estoque 0.
 */
export async function createRecipeMaterial(input: {
  category: string
  type: string
  unit: string
}): Promise<CreateRecipeMaterialResult> {
  await requireAdmin()

  const type = input.type.trim()
  if (!type) return { success: false, error: 'Informe o nome do insumo.' }

  const supabase = createServiceClient()

  const { data: cut } = await supabase
    .from('cut_categories')
    .select('category')
    .eq('category', input.category)
    .maybeSingle()

  if (cut) {
    return {
      success: true,
      option: {
        raw_material_id: null,
        category: input.category,
        type,
        unit: 'unidade',
        is_cut: true,
      },
    }
  }

  const { data, error } = await supabase
    .from('raw_materials')
    .insert({
      name: type,
      type: 'bruta',
      category: input.category,
      type_specific: type,
      unit: input.unit,
      stock_quantity: 0,
      minimum_stock: 0,
    })
    .select('id, category, type_specific, name, unit')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/estoque')
  revalidatePath('/admin/materias')

  return {
    success: true,
    option: {
      raw_material_id: data.id as string,
      category: data.category as string,
      type: (data.type_specific as string | null) ?? (data.name as string),
      unit: data.unit as string,
      is_cut: false,
    },
  }
}
```

- [ ] **Step 3: Componente `MaterialSelect`**

Crie `components/admin/material-select.tsx`, no mesmo molde do `ColorSelect`: um
`<select>` com `<optgroup>` para Cortes e outro para os de cor fixa, `+ Criar novo
insumo…` no fim, e um formulário inline que troca os campos conforme a categoria
escolhida (corte pede só o nome; cor fixa pede nome e unidade).

```tsx
"use client"

// Client component: guarda o estado do formulário inline de criação sem
// recarregar o modal do produto, que perderia tudo que já foi preenchido.

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { createRecipeMaterial } from '@/lib/actions/recipe-materials'
import type { CutCategoryRow } from '@/lib/types'
import type { RecipeMaterialOption } from '@/lib/supabase/admin-queries'

const CREATE_VALUE = '__novo__'
const FIXED_CATEGORIES = ['Aplicações', 'Metais', 'Aviamentos'] as const
const UNITS = ['unidade', 'metro', 'cm', 'kg'] as const

interface MaterialSelectProps {
  options: RecipeMaterialOption[]
  cutCategories: CutCategoryRow[]
  /** Chaves já na receita, para não oferecer duplicata. */
  usedKeys: Set<string>
  onPick: (option: RecipeMaterialOption) => void
  onCreated: (option: RecipeMaterialOption) => void
}

export function optionKey(o: Pick<RecipeMaterialOption, 'category' | 'type' | 'raw_material_id'>): string {
  return o.raw_material_id ?? `${o.category}||${o.type}`
}

export function MaterialSelect({
  options, cutCategories, usedKeys, onPick, onCreated,
}: MaterialSelectProps) {
  const [creating, setCreating] = useState(false)
  const [category, setCategory] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<string>('unidade')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const available = options.filter((o) => !usedKeys.has(optionKey(o)))
  const cuts = available.filter((o) => o.is_cut)
  const fixed = available.filter((o) => !o.is_cut)
  const isCutCategory = cutCategories.some((c) => c.category === category)

  async function handleCreate() {
    if (!category) { setError('Escolha a categoria.'); return }
    if (!name.trim()) { setError('Informe o nome do insumo.'); return }

    setSaving(true)
    setError(null)
    const result = await createRecipeMaterial({ category, type: name, unit })
    setSaving(false)

    if (!result.success) { setError(result.error); return }

    onCreated(result.option)
    onPick(result.option)
    setCreating(false)
    setCategory('')
    setName('')
    setUnit('unidade')
  }

  if (creating) {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 10, display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>Novo insumo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="field">
            <label>Categoria *</label>
            <select
              className="select"
              data-testid="select-nova-categoria-insumo"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Escolha…</option>
              <optgroup label="Cortes (cor vem da variante)">
                {cutCategories.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </optgroup>
              <optgroup label="Cor fixa">
                {FIXED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="field">
            <label>{isCutCategory ? 'Nome da peça *' : 'Nome do insumo *'}</label>
            <input
              className="input"
              data-testid="input-novo-insumo-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCutCategory ? 'Frente' : 'Zíper nº5 Dourado'}
            />
          </div>
        </div>

        {!isCutCategory && category && (
          <div className="field" style={{ maxWidth: 160 }}>
            <label>Unidade</label>
            <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}

        {isCutCategory && (
          <div className="cust-meta">
            A cor não entra aqui: ela vem da variante. O estoque desta peça por cor é
            criado depois, pelo botão de cortes pendentes.
          </div>
        )}

        {error && <div style={{ fontSize: 11.5, color: 'var(--red)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm primary" type="button" onClick={handleCreate} disabled={saving}>
            {saving ? 'Salvando…' : 'Criar e adicionar'}
          </button>
          <button
            className="btn sm ghost"
            type="button"
            onClick={() => { setCreating(false); setError(null) }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <select
      className="select"
      data-testid="select-bom-material"
      style={{ width: '100%' }}
      value=""
      onChange={(e) => {
        const v = e.target.value
        if (!v) return
        if (v === CREATE_VALUE) { setCreating(true); return }
        const picked = available.find((o) => optionKey(o) === v)
        if (picked) onPick(picked)
      }}
    >
      <option value="">+ Adicionar insumo…</option>
      {cuts.length > 0 && (
        <optgroup label="Cortes (cor vem da variante)">
          {cuts.map((o) => (
            <option key={optionKey(o)} value={optionKey(o)}>{o.category} › {o.type}</option>
          ))}
        </optgroup>
      )}
      {fixed.length > 0 && (
        <optgroup label="Aplicações · Metais · Aviamentos">
          {fixed.map((o) => (
            <option key={optionKey(o)} value={optionKey(o)}>{o.category} › {o.type} ({o.unit})</option>
          ))}
        </optgroup>
      )}
      <option value={CREATE_VALUE}>+ Criar novo insumo…</option>
    </select>
  )
}
```

- [ ] **Step 4: Ligar no modal**

Em `components/admin/produto-modal.tsx`, troque o `<select data-testid="select-bom-material">`
(e o `availableMaterials` que o alimentava) pelo `<MaterialSelect>`. `addBomRow` passa a
receber a `RecipeMaterialOption` em vez do id:

```typescript
  const [materialOptions, setMaterialOptions] = useState<RecipeMaterialOption[]>(recipeMaterials)

  function addBomRow(option: RecipeMaterialOption) {
    setBom((prev) => [
      ...prev,
      {
        tempBomId: `${Date.now()}-${Math.random()}`,
        raw_material_id: option.is_cut ? null : option.raw_material_id,
        material_category: option.category,
        material_type: option.type,
        quantity_needed: '1',
      },
    ])
  }
```

`recipeMaterials: RecipeMaterialOption[]` entra como prop nova do modal, vinda de
`getRecipeMaterialOptions()` em `app/admin/estoque/page.tsx` e repassada pelo
`EstoqueClient`.

- [ ] **Step 5: Compilar**

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/admin-queries.ts lib/actions/recipe-materials.ts components/admin/material-select.tsx components/admin/produto-modal.tsx app/admin/estoque/page.tsx components/admin/estoque-client.tsx
git commit -m "feat(receita): seletor lista cortes existentes e cria insumo inline"
```

---

## Pendências de aceite (para o Leonardo, não para o executor)

Não dá para afirmar daqui, porque exige o app de pé com env:

1. Criar produto com corte na receita → tentar salvar variante sem cor → erro aparece.
2. `+ Nova cor` cria a cor e já a seleciona, sem fechar o modal nem perder o formulário.
3. Trocar a cor no dropdown recalcula o estoque das peças na hora.
4. Abrir um dos 5 produtos legados → as categorias aparecem em "Indefinida (pendente)".
5. Tentar concluir uma OP de variante em "Indefinida" → erro "Defina a cor da variante antes de produzir".
6. `npm run test:e2e -- produto-modal` passa.
