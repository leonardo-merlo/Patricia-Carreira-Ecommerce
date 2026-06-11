-- Migration 012: Adiciona material_type em raw_materials + Lona → Tecido
-- material_type armazena o tipo específico dentro da categoria
-- (ex: Couro > legítimo de carneiro, Metais > mosquetão, Tecido > lona)

-- 1. Adicionar coluna material_type
ALTER TABLE public.raw_materials
  ADD COLUMN IF NOT EXISTS material_type text;

-- 2. Trocar 'Lona' por 'Tecido' no CHECK constraint
ALTER TABLE public.raw_materials
  DROP CONSTRAINT IF EXISTS raw_materials_category_check;

ALTER TABLE public.raw_materials
  ADD CONSTRAINT raw_materials_category_check
  CHECK (category IN ('Bordado', 'Couro', 'Metais', 'Forro', 'Tecido', 'Aviamentos'));

-- 3. Limpar cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
