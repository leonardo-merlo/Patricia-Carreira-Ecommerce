-- Migration 035: cores de produção por variante
--
-- Antes: a variante tinha color_lona/color_forro/color_couro como texto livre,
-- opcional, e o mapeamento categoria→coluna era um CASE escrito à mão em duas
-- funções. Adicionar uma categoria custava migration + código.
--
-- Agora:
--   · cut_categories     — quais categorias exigem cor (dado, não literal);
--   · material_colors    — a paleta, escopada por categoria;
--   · variant_cut_colors — a cor que a variante usa em cada categoria, com FK
--                          composta para a paleta (impede cor fora dela).
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
-- DROP antes do CREATE porque a assinatura muda: entra a coluna is_placeholder,
-- e CREATE OR REPLACE recusa mudança no tipo de retorno. Derrubar é seguro —
-- complete_production_order e revert_production_order são plpgsql e resolvem a
-- chamada em tempo de execução, não guardam dependência.
DROP FUNCTION IF EXISTS public.resolve_variant_bom(uuid);

CREATE FUNCTION public.resolve_variant_bom(p_variant_id uuid)
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
-- Só o bloco 0 é novo: antes de checar "existe o insumo nessa cor?", checa "a
-- cor foi de fato escolhida?". Sem isso a mensagem seria "insumo não cadastrado",
-- que manda o Henrique cadastrar um corte 'Indefinida' no estoque — o oposto do
-- que se quer.
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
