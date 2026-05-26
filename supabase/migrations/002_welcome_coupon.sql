-- Migration 9: Atualiza trigger para salvar phone e cpf do signup popup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.user_profiles (id, role, name, phone, cpf)
  values (
    new.id,
    'customer',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'cpf'
  );
  return new;
end;
$$;

-- Migration 10: Permite que clientes atualizem seu próprio perfil
create policy "customer_update_own" on public.user_profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Migration 11: Expande subcategorias permitidas para novos segmentos de vestuário
alter table public.products
  drop constraint if exists products_subcategory_check;

alter table public.products
  add constraint products_subcategory_check
  check (subcategory in ('vestidos', 'batas', 'macacoes', 'shorts', 'saias', 'camisas_tops'));

-- Migration 12: Cupons de boas-vindas
insert into public.coupons (code, type, value, min_order_value, max_uses, description, is_active)
values
  (
    'PRIMEIRACOMPRA10',
    'percent',
    10.00,
    0,
    null,
    'Popup de cadastro — 10% OFF + frete grátis na primeira compra',
    true
  ),
  (
    'BEMVINDA10',
    'percent',
    10.00,
    0,
    null,
    'Barra rotativa — 10% OFF na primeira compra',
    true
  )
on conflict (code) do nothing;
