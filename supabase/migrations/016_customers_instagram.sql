-- Migration 016: campo de Instagram do cliente
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS instagram text;
NOTIFY pgrst, 'reload schema';
