-- Migration 1: Perfis de usuário
create table public.user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'customer')),
  name       text,
  phone      text,
  cpf        text,
  created_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "admin_all" on public.user_profiles
  for all using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "customer_own" on public.user_profiles
  for select using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.user_profiles (id, role, name)
  values (new.id, 'customer', new.raw_user_meta_data->>'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Migration 2: Catálogo
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  description     text,
  category        text not null check (category in ('bolsas', 'roupas', 'acessorios')),
  subcategory     text check (subcategory in ('vestidos', 'batas')),
  base_price      numeric(10,2) not null,
  wholesale_price numeric(10,2),
  is_active       boolean default true,
  images          text[] default '{}',
  weight_grams    integer,
  length_cm       integer,
  width_cm        integer,
  height_cm       integer,
  measurements    jsonb,
  created_at      timestamptz default now()
);

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  sku            text unique not null,
  size           text,
  color          text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at     timestamptz default now()
);

alter table public.products enable row level security;
alter table public.product_variants enable row level security;

create policy "public_read_products" on public.products
  for select using (is_active = true);

create policy "public_read_variants" on public.product_variants
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active = true
    )
  );

-- Migration 3: Clientes
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id),
  type       text not null default 'retail' check (type in ('retail', 'wholesale')),
  name       text not null,
  email      text,
  phone      text,
  cpf_cnpj   text,
  address    jsonb,
  created_at timestamptz default now()
);

alter table public.customers enable row level security;

create policy "admin_all_customers" on public.customers
  for all using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "customer_own_customer" on public.customers
  for select using (user_id = auth.uid());

-- Migration 4: Cupons (obrigatória antes de orders — FK)
create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  type            text not null check (type in ('percent', 'fixed')),
  value           numeric(10,2) not null,
  min_order_value numeric(10,2) default 0,
  max_uses        integer,
  uses_count      integer default 0,
  valid_from      timestamptz default now(),
  valid_until     timestamptz,
  is_active       boolean default true,
  description     text,
  created_at      timestamptz default now()
);

alter table public.coupons enable row level security;

create policy "public_read_active_coupons" on public.coupons
  for select using (is_active = true);

-- Migration 5: Pedidos
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references public.customers(id),
  type            text not null default 'retail' check (type in ('retail', 'wholesale')),
  status          text not null default 'pending',
  total_amount    numeric(10,2) not null,
  discount_amount numeric(10,2) default 0,
  shipping_amount numeric(10,2) default 0,
  payment_status  text default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  payment_id      text,
  payment_method  text check (payment_method in ('pix', 'credit_card', 'boleto')),
  shipping_method text,
  tracking_code   text,
  coupon_id       uuid references public.coupons(id),
  nfe_number      text,
  nfe_url         text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id),
  quantity           integer not null,
  unit_price         numeric(10,2) not null,
  product_name       text not null,
  created_at         timestamptz default now()
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "customer_insert_order" on public.orders
  for insert with check (true);

create policy "customer_own_orders" on public.orders
  for select using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

create policy "customer_own_items" on public.order_items
  for select using (
    order_id in (
      select o.id from public.orders o
      join public.customers c on c.id = o.customer_id
      where c.user_id = auth.uid()
    )
  );

-- Migration 6: Auditoria de estoque
create table public.stock_adjustments (
  id              uuid primary key default gen_random_uuid(),
  target          text not null check (target in ('product_variant', 'raw_material')),
  target_id       uuid not null,
  quantity_before numeric(10,3) not null,
  quantity_after  numeric(10,3) not null,
  delta           numeric(10,3) not null,
  reason          text not null,
  notes           text,
  created_by      text not null,
  created_at      timestamptz default now()
);

alter table public.stock_adjustments enable row level security;

-- Migration 7: Função atômica de decremento (evita race condition)
create or replace function decrement_stock(
  p_variant_id uuid,
  p_quantity   integer
) returns void language plpgsql as $$
declare
  v_before integer;
begin
  select stock_quantity into v_before
  from product_variants
  where id = p_variant_id
  for update;

  if v_before < p_quantity then
    raise exception 'Estoque insuficiente para variante %', p_variant_id;
  end if;

  update product_variants
  set stock_quantity = stock_quantity - p_quantity
  where id = p_variant_id;

  insert into stock_adjustments
    (target, target_id, quantity_before, quantity_after, delta, reason, created_by)
  values
    ('product_variant', p_variant_id, v_before, v_before - p_quantity, -p_quantity, 'venda', 'sistema');
end;
$$;

-- Migration 8: Trigger updated_at em orders
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function update_updated_at();
