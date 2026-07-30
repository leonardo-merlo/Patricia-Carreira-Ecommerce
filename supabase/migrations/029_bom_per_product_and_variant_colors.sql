-- Migration 029: receita por PRODUTO + cores de produção por VARIANTE
--
-- Antes: bill_of_materials apontava para product_variant_id, o que obrigava a
-- repetir a mesma receita em cada cor (a Flora tem 7 variantes).
--
-- Agora:
--   · a receita é do PRODUTO — cadastrada uma vez, herdada por todas as cores;
--   · a VARIANTE declara as cores de lona, forro e couro;
--   · itens de corte referenciam o TIPO (categoria + tipo), não uma linha fixa
--     de raw_materials — a cor sai da variante em tempo de consulta;
--   · itens sem cor (Aplicações, Metais, Aviamentos) referenciam raw_material_id
--     direto, como antes.
--
-- Isso mantém o estoque por cor: "Corte Lona › Frente › Mostarda" é uma linha
-- de estoque distinta de "Corte Lona › Frente › Marinho".

-- ─── 1. Cores de produção na variante ────────────────────────────────────────
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS color_lona  text,
  ADD COLUMN IF NOT EXISTS color_forro text,
  ADD COLUMN IF NOT EXISTS color_couro text;

COMMENT ON COLUMN public.product_variants.color_lona  IS 'Cor da lona usada nesta variante — resolve os itens Corte Lona da receita';
COMMENT ON COLUMN public.product_variants.color_forro IS 'Cor do forro usado nesta variante — resolve os itens Corte Forro da receita';
COMMENT ON COLUMN public.product_variants.color_couro IS 'Cor do couro usado nesta variante — resolve os itens Corte Couro da receita';

-- ─── 2. bill_of_materials redesenhada ────────────────────────────────────────
-- A tabela já foi esvaziada na migration 028; recriar é mais limpo que 6 ALTERs.
DROP TABLE IF EXISTS public.bill_of_materials;

CREATE TABLE public.bill_of_materials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Item de cor fixa (Aplicações, Metais, Aviamentos): aponta direto o insumo.
  raw_material_id   uuid REFERENCES public.raw_materials(id) ON DELETE RESTRICT,

  -- Item que varia com a cor da variante (Corte Lona/Forro/Couro): guarda o
  -- tipo; a cor vem de product_variants.color_<lona|forro|couro>.
  material_category text,
  material_type     text,

  quantity_needed   numeric(10,3) NOT NULL CHECK (quantity_needed > 0),
  created_at        timestamptz DEFAULT now(),

  -- Exatamente uma das duas formas de endereçar o insumo
  CONSTRAINT bom_target_check CHECK (
    (raw_material_id IS NOT NULL AND material_category IS NULL AND material_type IS NULL)
    OR
    (raw_material_id IS NULL AND material_category IS NOT NULL AND material_type IS NOT NULL)
  ),

  CONSTRAINT bom_variable_category_check CHECK (
    material_category IS NULL
    OR material_category IN ('Corte Lona', 'Corte Forro', 'Corte Couro')
  )
);

-- Um item por receita: ou o insumo fixo, ou o par categoria+tipo.
CREATE UNIQUE INDEX bom_product_material_key
  ON public.bill_of_materials (product_id, raw_material_id)
  WHERE raw_material_id IS NOT NULL;

CREATE UNIQUE INDEX bom_product_type_key
  ON public.bill_of_materials (product_id, material_category, material_type)
  WHERE material_category IS NOT NULL;

CREATE INDEX bom_product_idx ON public.bill_of_materials (product_id);

ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bom" ON public.bill_of_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON public.bill_of_materials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_of_materials TO authenticated;
GRANT SELECT ON public.bill_of_materials TO anon;

-- ─── 3. Resolução da receita para uma variante ───────────────────────────────
-- Traduz a receita do produto + as cores da variante na lista concreta de
-- insumos. `resolved = false` significa que o insumo daquela cor ainda não foi
-- cadastrado — a UI mostra isso como pendência em vez de fingir que existe.
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
  resolved          boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH variant AS (
    SELECT v.id, v.product_id, v.color_lona, v.color_forro, v.color_couro
    FROM public.product_variants v
    WHERE v.id = p_variant_id
  ),
  lines AS (
    SELECT
      b.id AS bom_id,
      b.raw_material_id,
      b.material_category,
      b.material_type,
      b.quantity_needed,
      CASE b.material_category
        WHEN 'Corte Lona'  THEN v.color_lona
        WHEN 'Corte Forro' THEN v.color_forro
        WHEN 'Corte Couro' THEN v.color_couro
      END AS required_color
    FROM public.bill_of_materials b
    JOIN variant v ON v.product_id = b.product_id
  )
  SELECT
    l.bom_id,
    COALESCE(fixed.id, matched.id)                          AS raw_material_id,
    COALESCE(fixed.name, matched.name, l.material_type)     AS material_name,
    COALESCE(fixed.category, l.material_category)           AS material_category,
    COALESCE(fixed.type_specific, l.material_type)          AS material_type,
    l.required_color,
    COALESCE(fixed.unit, matched.unit, 'unidade')           AS unit,
    COALESCE(fixed.stock_quantity, matched.stock_quantity, 0) AS stock_quantity,
    l.quantity_needed,
    (COALESCE(fixed.id, matched.id) IS NOT NULL)            AS resolved
  FROM lines l
  LEFT JOIN public.raw_materials fixed
    ON fixed.id = l.raw_material_id
  LEFT JOIN public.raw_materials matched
    ON l.raw_material_id IS NULL
   AND matched.category      = l.material_category
   AND matched.type_specific = l.material_type
   AND matched.color IS NOT DISTINCT FROM l.required_color;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_variant_bom(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_variant_bom(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
