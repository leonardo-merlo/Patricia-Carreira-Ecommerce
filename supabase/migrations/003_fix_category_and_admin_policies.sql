-- Migration 3: Fix category constraint + admin write policies

-- Add 'bazar' to product category check
alter table public.products
  drop constraint products_category_check,
  add constraint products_category_check
    check (category in ('bolsas', 'roupas', 'acessorios', 'bazar'));

-- Admin: full access to products (incl. inactive)
create policy "admin_all_products" on public.products
  for all using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admin: full access to variants
create policy "admin_all_variants" on public.product_variants
  for all using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
