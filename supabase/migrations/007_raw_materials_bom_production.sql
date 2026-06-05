-- ====================================================
-- Migration 007: Matérias-primas, BOM e Produção
-- ====================================================
-- Aplicado ao banco remoto em 2026-06-04 via MCP

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. Matérias-primas
CREATE TABLE public.raw_materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  type            text NOT NULL DEFAULT 'bruta'
                  CHECK (type IN ('bruta', 'intermediaria')),
  category        text NOT NULL CHECK (category IN (
    'Tecido', 'Cortes', 'Metais', 'Couro Legítimo',
    'Couro Sintético', 'Forro', 'Bordado', 'Aviamento', 'Aplicações'
  )),
  subcategory     text,
  color           text,
  unit            text NOT NULL CHECK (unit IN ('metro', 'unidade', 'kg', 'cm')),
  stock_quantity  numeric(10,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_stock   numeric(10,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  cost_per_unit   numeric(10,2),
  supplier        text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_raw_materials" ON public.raw_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Receita de MPs intermediárias
CREATE TABLE public.raw_material_recipes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  input_material_id  uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_needed    numeric(10,3) NOT NULL CHECK (quantity_needed > 0),
  UNIQUE(output_material_id, input_material_id)
);

ALTER TABLE public.raw_material_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_raw_material_recipes" ON public.raw_material_recipes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Bill of Materials
CREATE TABLE public.bill_of_materials (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  raw_material_id    uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_needed    numeric(10,3) NOT NULL CHECK (quantity_needed > 0),
  UNIQUE(product_variant_id, raw_material_id)
);

ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bom" ON public.bill_of_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Ordens de produção
CREATE TABLE public.production_orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type        text NOT NULL CHECK (type IN ('corte', 'acabamento', 'beneficiamento')),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'materials_checked', 'approved', 'in_progress', 'completed', 'cancelled'
  )),
  notes       text,
  created_by  text NOT NULL DEFAULT 'henrique',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_production_orders" ON public.production_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER production_orders_updated_at
  BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Itens das ordens de produção
-- XOR: product_variant_id (acabamento) OU output_material_id (corte), nunca os dois
CREATE TABLE public.production_order_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id   uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  product_variant_id    uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  output_material_id    uuid REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_requested    integer NOT NULL CHECK (quantity_requested > 0),
  quantity_produced     integer NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
  materials_sufficient  boolean,
  missing_materials     jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT chk_poi_output CHECK (
    (product_variant_id IS NOT NULL) <> (output_material_id IS NOT NULL)
  )
);

ALTER TABLE public.production_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_production_order_items" ON public.production_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Grants de acesso (service_role bypassa RLS; anon/authenticated ficam sujeitos às policies)
GRANT ALL ON public.raw_materials          TO service_role;
GRANT ALL ON public.raw_material_recipes   TO service_role;
GRANT ALL ON public.bill_of_materials      TO service_role;
GRANT ALL ON public.production_orders      TO service_role;
GRANT ALL ON public.production_order_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_materials          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_material_recipes   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_of_materials      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_orders      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_order_items TO authenticated;

GRANT SELECT ON public.raw_materials          TO anon;
GRANT SELECT ON public.raw_material_recipes   TO anon;
GRANT SELECT ON public.bill_of_materials      TO anon;
GRANT SELECT ON public.production_orders      TO anon;
GRANT SELECT ON public.production_order_items TO anon;
