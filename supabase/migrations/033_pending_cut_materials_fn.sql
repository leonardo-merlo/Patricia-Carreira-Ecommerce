-- Migration 033: lista os insumos de corte que faltam cadastrar
--
-- Cruza a receita dos produtos com as cores declaradas nas variantes e devolve
-- as combinações (categoria, tipo, cor) que ainda não existem em raw_materials.
-- É o que alimenta o botão "cadastrar insumos faltantes" no painel: sem ele, o
-- Henrique teria que criar ~35 tipos de corte × cada cor no formulário, um a um.
--
-- Variante sem a cor preenchida é ignorada (não dá para adivinhar a cor).

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
      CASE b.material_category
        WHEN 'Corte Lona'  THEN v.color_lona
        WHEN 'Corte Forro' THEN v.color_forro
        WHEN 'Corte Couro' THEN v.color_couro
      END                 AS color,
      p.name              AS product_name
    FROM public.bill_of_materials b
    JOIN public.product_variants v ON v.product_id = b.product_id
    JOIN public.products p         ON p.id = b.product_id
    WHERE b.material_category IS NOT NULL
  )
  SELECT
    l.category,
    l.type_specific,
    l.color,
    count(*)                                                   AS variant_count,
    string_agg(DISTINCT l.product_name, ', ' ORDER BY l.product_name) AS products
  FROM lines l
  LEFT JOIN public.raw_materials rm
    ON rm.category      = l.category
   AND rm.type_specific = l.type_specific
   AND rm.color IS NOT DISTINCT FROM l.color
  WHERE l.color IS NOT NULL
    AND rm.id IS NULL
  GROUP BY l.category, l.type_specific, l.color
  ORDER BY l.category, l.type_specific, l.color;
$$;

GRANT EXECUTE ON FUNCTION public.pending_cut_materials() TO service_role;
GRANT EXECUTE ON FUNCTION public.pending_cut_materials() TO authenticated;

NOTIFY pgrst, 'reload schema';
