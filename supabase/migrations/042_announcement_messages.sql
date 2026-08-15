-- 042 — Mensagens do banner da loja
--
-- As frases do topo estavam fixas no componente: mudar "frete grátis acima de
-- R$ 599" exigia deploy. Passam a viver no banco, com markup mínimo para colocar
-- link numa palavra.

create table if not exists public.announcement_messages (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcement_messages_order_idx
  on public.announcement_messages (is_active, sort_order);

alter table public.announcement_messages enable row level security;

-- Leitura pública das mensagens ativas. O banner é renderizado no servidor pelo
-- service client, que ignora RLS, mas deixar a policy correta evita surpresa se
-- um dia alguém ler isto do navegador.
drop policy if exists "announcement_messages_public_read" on public.announcement_messages;
create policy "announcement_messages_public_read"
  on public.announcement_messages
  for select
  using (is_active = true);

-- Grants na própria migration de criação: sem isto o service_role leva
-- "permission denied" mesmo tendo RLS liberado.
grant select on public.announcement_messages to anon, authenticated;
grant select, insert, update, delete on public.announcement_messages to service_role;

-- Seed com exatamente as frases que já estavam no ar, para a loja não mudar de
-- comportamento na virada.
insert into public.announcement_messages (content, sort_order, is_active)
select * from (values
  ('Frete grátis nas compras acima de R$ 599,00', 1, true),
  ('Compre no site e retire na loja', 2, true),
  ('Parcelamento em até 5x sem juros. Aproveite!', 3, true),
  ('10% OFF na sua primeira compra usando o cupom: **BEMVINDA10**', 4, true),
  ('5% OFF pagamento via PIX', 5, true),
  ('Descubra a história por trás de cada peça — [Sobre nós](/sobre)', 6, true),
  ('Envios internacionais — [Falar pelo WhatsApp](https://wa.me/5522988223993?text=Quero%20saber%20sobre%20envios%20internacionais.)', 7, true)
) as seed(content, sort_order, is_active)
where not exists (select 1 from public.announcement_messages);

comment on table public.announcement_messages is
  'Frases do banner rotativo do topo da loja. content aceita [texto](url) e **negrito**.';
