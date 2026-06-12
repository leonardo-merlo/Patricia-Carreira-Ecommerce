-- Migration 014: Rename material_type → type_specific, add state column
-- type_specific: tipo específico dentro da categoria (ex: Legítimo carneiro, Argola)
-- state: estado/processamento do material (ex: Bruto, Com laser, P, M, G)

-- Rename material_type → type_specific
ALTER TABLE public.raw_materials RENAME COLUMN material_type TO type_specific;

-- Add state column
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS state text;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
