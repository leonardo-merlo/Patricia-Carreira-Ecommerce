-- Migration 018: tags manuais do produto (controladas pelo Henrique)
-- Rótulos visuais como Lançamento, Promoção, Bazar. Não alteram a categoria.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
NOTIFY pgrst, 'reload schema';
