-- Migration 017: lojas (unidades físicas do Henrique) + vínculo com contas a pagar

CREATE TABLE IF NOT EXISTS public.stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  city        text,
  notes       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_stores" ON public.stores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- GRANTs explícitos (Supabase não concede DML automaticamente em tabelas criadas via SQL)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;

-- Vínculo conta a pagar → loja
ALTER TABLE public.accounts_payable
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
