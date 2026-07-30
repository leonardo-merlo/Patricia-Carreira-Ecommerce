-- Migration 028: categorias de matéria-prima alinhadas à ficha técnica
--
-- O Henrique não controla metro de lona/couro/forro — ele controla PEÇA CORTADA.
-- As categorias passam a espelhar as seções da ficha técnica:
--   Corte Lona · Corte Forro · Corte Couro · Aplicações · Metais · Aviamentos
--
-- Limpeza aprovada: zera matérias-primas e receitas de seed/teste. Os
-- registros antigos (Couro Legítimo, Forro, Mosquetão, Bordado Floral Briana,
-- TESTE, FAKE, 123) não têm equivalente na nova estrutura.

-- ─── 1. Limpeza dos dados de seed/teste ──────────────────────────────────────
DELETE FROM public.bill_of_materials;
DELETE FROM public.raw_material_recipes;
DELETE FROM public.purchase_requests;
DELETE FROM public.raw_materials;

-- ─── 2. Novas categorias ─────────────────────────────────────────────────────
ALTER TABLE public.raw_materials
  DROP CONSTRAINT IF EXISTS raw_materials_category_check;

ALTER TABLE public.raw_materials
  ADD CONSTRAINT raw_materials_category_check
  CHECK (category IN (
    'Corte Lona',
    'Corte Forro',
    'Corte Couro',
    'Aplicações',
    'Metais',
    'Aviamentos'
  ));

-- ─── 3. Unicidade do insumo ──────────────────────────────────────────────────
-- Um insumo é identificado por categoria + tipo + cor. Cortes e aplicações têm
-- cor; metais e aviamentos não (color IS NULL). Índices parciais porque NULL
-- não colide em UNIQUE comum.
CREATE UNIQUE INDEX IF NOT EXISTS raw_materials_cat_type_color_key
  ON public.raw_materials (category, type_specific, color)
  WHERE color IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS raw_materials_cat_type_nocolor_key
  ON public.raw_materials (category, type_specific)
  WHERE color IS NULL;

NOTIFY pgrst, 'reload schema';
