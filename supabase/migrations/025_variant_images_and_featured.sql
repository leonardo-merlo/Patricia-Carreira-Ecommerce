-- Migration 025: fotos por variante + destaque na home
--
-- Fotos migram de products.images para product_variants.images (fonte de verdade
-- daqui pra frente). products.images é mantido no schema (não dropado) por segurança
-- — seed.sql e qualquer script externo continuam funcionando — mas o código da
-- aplicação para de ler/escrever nela a partir desta mudança.

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Backfill: variantes existentes sem fotos próprias herdam as fotos do produto.
UPDATE public.product_variants v
SET images = p.images
FROM public.products p
WHERE v.product_id = p.id
  AND v.images = '{}'
  AND p.images <> '{}';

NOTIFY pgrst, 'reload schema';
