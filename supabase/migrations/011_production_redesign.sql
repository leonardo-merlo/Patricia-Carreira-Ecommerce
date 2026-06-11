-- Migration 011: Redesign production orders + update MP categories
-- Removes production_order_items, flattens OP model, updates MP categories, adds minimum_batch_qty to products

-- 1. Truncate test data
TRUNCATE TABLE public.production_order_items CASCADE;
TRUNCATE TABLE public.production_orders CASCADE;
TRUNCATE TABLE public.raw_materials CASCADE;

-- 2. Drop production_order_items (no longer needed in flat OP model)
DROP TABLE IF EXISTS public.production_order_items;

-- 3. Redesign production_orders: remove old columns, update status constraint, add new columns
ALTER TABLE public.production_orders
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS depends_on_op_id;

ALTER TABLE public.production_orders
  DROP CONSTRAINT IF EXISTS production_orders_status_check;

ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS product_variant_id uuid
    REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS quantity_requested integer NOT NULL DEFAULT 1
    CHECK (quantity_requested > 0),
  ADD COLUMN IF NOT EXISTS quantity_produced integer NOT NULL DEFAULT 0
    CHECK (quantity_produced >= 0),
  ADD COLUMN IF NOT EXISTS materials_sufficient boolean,
  ADD COLUMN IF NOT EXISTS missing_materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS material_checks jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.production_orders
  ADD CONSTRAINT production_orders_status_check
  CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled'));

-- 4. Update raw_materials categories to the 6 new ones
ALTER TABLE public.raw_materials
  DROP CONSTRAINT IF EXISTS raw_materials_category_check;

ALTER TABLE public.raw_materials
  ADD CONSTRAINT raw_materials_category_check
  CHECK (category IN ('Bordado', 'Couro', 'Metais', 'Forro', 'Lona', 'Aviamentos'));

-- 5. Add minimum_batch_qty to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS minimum_batch_qty integer NOT NULL DEFAULT 1
    CHECK (minimum_batch_qty > 0);

-- 6. Grants
GRANT ALL ON public.production_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_orders TO authenticated;
