-- Migration 015: corrige GRANTs ausentes na tabela suppliers
-- A tabela (migration 013) foi criada sem os privilégios DML para os roles do
-- Supabase, causando "permission denied for table suppliers" mesmo via
-- service_role. Concede os privilégios padrão usados pelo Supabase.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT ON public.suppliers TO anon;

NOTIFY pgrst, 'reload schema';
