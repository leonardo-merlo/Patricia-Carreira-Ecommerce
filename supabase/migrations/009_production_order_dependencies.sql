-- ====================================================
-- Migration 009: Dependência entre ordens de produção
-- ====================================================
-- depends_on_op_id: OP de acabamento aponta para a OP de corte que precisa
-- ser concluída primeiro (cadeia: corte → acabamento)

ALTER TABLE public.production_orders
  ADD COLUMN depends_on_op_id uuid REFERENCES public.production_orders(id) ON DELETE SET NULL;

GRANT ALL ON public.production_orders TO service_role;
