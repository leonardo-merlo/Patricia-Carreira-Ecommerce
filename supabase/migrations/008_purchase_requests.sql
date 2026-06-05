-- ====================================================
-- Migration 008: Pedidos de compra de matéria-prima
-- ====================================================
-- Aplicado ao banco remoto via MCP

CREATE TABLE public.purchase_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE SET NULL,
  material_name   text NOT NULL,
  quantity_needed numeric(10,3) NOT NULL CHECK (quantity_needed > 0),
  unit            text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_purchase_requests" ON public.purchase_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER purchase_requests_updated_at
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT ALL ON public.purchase_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requests TO authenticated;
GRANT SELECT ON public.purchase_requests TO anon;
