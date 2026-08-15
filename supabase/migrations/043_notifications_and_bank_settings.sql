-- 043 — Estado das notificações + preferências que a tela de config prometia
--
-- Duas coisas que andam juntas porque as duas nascem da mesma revisão da tela de
-- Configurações: as notificações do painel e os campos que estavam lá só de
-- enfeite (dados bancários digitados que nunca eram gravados).

-- ─── Estado de leitura das notificações ──────────────────────────────────────
--
-- Guarda só o estado, nunca o fato. A notificação em si é derivada dos dados
-- (conta a vencer, pedido novo, estoque baixo): duplicar isso numa tabela
-- criaria uma segunda verdade, que envelhece e passa a mentir.

create table if not exists public.notification_reads (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,
  ref_id       text not null,
  read_at      timestamptz,
  dismissed_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint notification_reads_kind_check
    check (kind in ('account_due', 'new_order', 'low_stock', 'low_material')),
  constraint notification_reads_unique unique (kind, ref_id)
);

create index if not exists notification_reads_lookup_idx
  on public.notification_reads (kind, ref_id);

alter table public.notification_reads enable row level security;

-- Só o painel lê e escreve, sempre pelo service client. Sem policy para anon.
grant select, insert, update, delete on public.notification_reads to service_role;

comment on table public.notification_reads is
  'Estado de leitura das notificações do painel. O fato continua derivado dos dados.';

-- ─── Preferências de notificação e dados bancários ───────────────────────────

alter table public.store_settings
  -- Janela do aviso de conta a pagar: quantos dias antes começa e quantos dias
  -- depois do vencimento ainda insiste.
  add column if not exists notif_bill_days_ahead  integer not null default 7,
  add column if not exists notif_bill_grace_days  integer not null default 1,
  -- Conta bancária: a tela já mostrava esses campos, mas eram defaultValue sem
  -- nenhum destino. Digitar e ver sumir no refresh é pior do que não ter campo.
  add column if not exists bank_name          text,
  add column if not exists bank_account_type  text,
  add column if not exists bank_agency        text,
  add column if not exists bank_account       text;

alter table public.store_settings
  drop constraint if exists store_settings_bill_window_check;

alter table public.store_settings
  add constraint store_settings_bill_window_check
  check (
    notif_bill_days_ahead between 0 and 60
    and notif_bill_grace_days between 0 and 30
  );

-- Os grants de store_settings são table-level, então as colunas novas já entram
-- cobertas — diferente de user_profiles, onde a lista fechada exigiu reemitir.
