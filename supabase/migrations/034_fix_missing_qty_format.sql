-- Migration 034: garante format_qty no histórico remoto
--
-- A função foi introduzida junto com a 030 (que já a define). Este arquivo
-- existe para o histórico local bater com o remoto, onde ela foi aplicada
-- separadamente. É idempotente.

CREATE OR REPLACE FUNCTION public.format_qty(p_qty numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT rtrim(rtrim(to_char(p_qty, 'FM999999990.999'), '0'), '.');
$$;

GRANT EXECUTE ON FUNCTION public.format_qty(numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.format_qty(numeric) TO authenticated;
