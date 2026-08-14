-- Uso de cupom por pedido.
--
-- A feature ja existia inteira no codigo — recordCouponUsage grava a linha e
-- incrementa o contador, validateCoupon consulta o limite por usuario, e o
-- formulario do admin tem o campo "Limite por usuario" — mas a migration nunca
-- foi aplicada. Sintomas: "Erro ao atualizar cupom" (PGRST204 em
-- max_uses_per_user) e uses_count travado em zero.

create table if not exists coupon_usages (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references coupons(id) on delete cascade,
  order_id   uuid not null references orders(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  email      text,
  created_at timestamptz default now(),
  -- Webhook do MP chega duplicado: a mesma dupla cupom+pedido nao pode contar duas vezes
  unique (coupon_id, order_id)
);

create index if not exists coupon_usages_coupon_user_idx
  on coupon_usages (coupon_id, user_id);

alter table coupons
  add column if not exists max_uses_per_user integer;

create or replace function increment_coupon_uses(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update coupons
     set uses_count = coalesce(uses_count, 0) + 1
   where id = p_coupon_id;
end;
$$;

-- Sem politica: leitura e escrita apenas pelo service_role, como as demais
-- tabelas administrativas.
alter table coupon_usages enable row level security;

grant select, insert, update, delete on coupon_usages to service_role;
grant execute on function increment_coupon_uses(uuid) to service_role;
