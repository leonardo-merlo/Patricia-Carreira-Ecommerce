-- Migration 013: Tabela de fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  cnpj          text,
  contact_name  text,
  phone         text,
  email         text,
  city          text,
  address       text,
  rating        integer DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
  notes         text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_suppliers" ON public.suppliers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Link matérias-primas a fornecedores
ALTER TABLE public.raw_materials
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Schema cache refresh
NOTIFY pgrst, 'reload schema';
