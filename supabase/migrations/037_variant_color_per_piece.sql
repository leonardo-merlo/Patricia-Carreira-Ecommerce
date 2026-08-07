-- Migration 037: a cor da variante passa a ser por PEÇA, não por categoria
--
-- Motivo: na ficha do Henrique a frente de lona pode ser azul e as costas verde.
-- A 035 assumiu uma cor por categoria, o que não representa a bolsa real.
--
-- A chave é (variante, categoria, peça) e NÃO bill_of_materials.id de propósito:
-- saveProductBom apaga e recria toda a receita a cada "Salvar produto", então uma
-- FK para o id levaria as cores junto em cada gravação. Casar por texto sobrevive
-- à recriação da receita.
--
-- O dropdown da categoria continua na tela, mas como atalho que pinta todas as
-- peças daquela categoria de uma vez — não como o dado em si.

ALTER TABLE public.variant_cut_colors
  ADD COLUMN IF NOT EXISTS material_type text;

-- A chave velha (variant_id, category) sai ANTES da expansão. Fazer o INSERT com
-- ela ainda de pé faz cada peça nova colidir com a linha da categoria e ser
-- descartada pelo ON CONFLICT — as linhas somem em vez de multiplicar.
ALTER TABLE public.variant_cut_colors
  DROP CONSTRAINT IF EXISTS variant_cut_colors_pkey;

-- Expande cada linha de categoria em uma linha por peça daquela categoria na
-- receita do produto. A cor escolhida vale para todas, como valia antes.
INSERT INTO public.variant_cut_colors (variant_id, category, material_type, color)
SELECT DISTINCT
  vc.variant_id,
  vc.category,
  b.material_type,
  vc.color
FROM public.variant_cut_colors vc
JOIN public.product_variants v ON v.id = vc.variant_id
JOIN public.bill_of_materials b
  ON b.product_id = v.product_id
 AND b.material_category = vc.category
WHERE vc.material_type IS NULL;

-- Fora as linhas antigas (as sem peça), que já foram expandidas acima.
DELETE FROM public.variant_cut_colors WHERE material_type IS NULL;

ALTER TABLE public.variant_cut_colors
  ALTER COLUMN material_type SET NOT NULL;

ALTER TABLE public.variant_cut_colors
  ADD CONSTRAINT variant_cut_colors_pkey
  PRIMARY KEY (variant_id, category, material_type);

-- ─── Resolução casa peça a peça ──────────────────────────────────────────────
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
      ON vc.variant_id    = v.id
     AND vc.category      = b.material_category
     AND vc.material_type = b.material_type
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
      ON vc.variant_id    = v.id
     AND vc.category      = b.material_category
     AND vc.material_type = b.material_type
    JOIN public.material_colors mc
      ON mc.category = vc.category
     AND mc.name     = vc.color
    WHERE b.material_category IS NOT NULL
      AND mc.is_placeholder = false
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

NOTIFY pgrst, 'reload schema';
