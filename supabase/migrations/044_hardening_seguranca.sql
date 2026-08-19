-- 044 — Hardening de segurança a partir dos achados do auditor do Supabase (19/08/2026).
--
-- Três frentes:
--   1. EXECUTE de função SECURITY DEFINER aberto para anon/authenticated
--   2. search_path mutável em oito funções
--   3. RLS ligado sem nenhuma policy em três tabelas
--
-- Nenhum CREATE OR REPLACE FUNCTION aqui de propósito: replace não preserva
-- grants, e cinco destas funções têm EXECUTE explícito para `authenticated` que
-- precisa sobreviver. ALTER FUNCTION ... SET search_path não mexe em ACL.

-- ─── 1. EXECUTE das funções SECURITY DEFINER ─────────────────────────────────

-- O único com risco real: estava executável pelo papel anônimo, ou seja,
-- qualquer visitante podia estourar uses_count de um cupom e derrubar a
-- promoção. A aplicação só chama via createServiceClient
-- (lib/supabase/coupons.ts) e service role ignora grant.
revoke execute on function public.increment_coupon_uses(uuid) from public, anon, authenticated;
grant  execute on function public.increment_coupon_uses(uuid) to postgres, service_role;

-- Sem nenhuma chamada por RPC no código.
revoke execute on function public.get_variant_bom_data(uuid, integer) from public, anon, authenticated;
grant  execute on function public.get_variant_bom_data(uuid, integer) to postgres, service_role;

-- Função do gatilho on_auth_user_created em auth.users. O EXECUTE de gatilho é
-- verificado na criação do trigger, não a cada disparo; o grant explícito para
-- supabase_auth_admin fica registrado por segurança.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant  execute on function public.handle_new_user() to postgres, service_role, supabase_auth_admin;

-- Função do event trigger ensure_rls (ddl_command_end). Event trigger não passa
-- pelo grant dos papéis de aplicação.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant  execute on function public.rls_auto_enable() to postgres;

-- ─── 2. search_path fixo ─────────────────────────────────────────────────────
-- Todas são SECURITY INVOKER e nenhuma referencia objeto fora de `public`
-- (conferido em pg_proc.prosrc antes de fixar), então restringir não quebra nada.

alter function public.decrement_stock(uuid, integer)            set search_path = public, pg_temp;
alter function public.increment_stock(uuid, integer, text, text) set search_path = public, pg_temp;
alter function public.update_updated_at()                        set search_path = public, pg_temp;
alter function public.revert_production_order(uuid, text)        set search_path = public, pg_temp;
alter function public.pending_cut_materials()                    set search_path = public, pg_temp;
alter function public.format_qty(numeric)                        set search_path = public, pg_temp;
alter function public.complete_production_order(uuid)            set search_path = public, pg_temp;
alter function public.resolve_variant_bom(uuid)                  set search_path = public, pg_temp;

-- ─── 3. Policies nas três tabelas com RLS ligado e nenhuma regra ─────────────
--
-- As três são escritas exclusivamente por service role (que ignora RLS), então
-- a policy existe para descrever quem legitimamente *lê* cada uma — não para
-- liberar escrita. Por isso SELECT, e não o `FOR ALL` das outras tabelas:
-- stock_adjustments é trilha de auditoria e não deve ser editável por sessão de
-- usuário nem pelo próprio admin; coupon_usages e notification_reads seguem o
-- mesmo raciocínio.

create policy admin_read_coupon_usages on public.coupon_usages
  for select using (
    exists (select 1 from user_profiles where user_profiles.id = auth.uid() and user_profiles.role = 'admin')
  );

create policy admin_read_notification_reads on public.notification_reads
  for select using (
    exists (select 1 from user_profiles where user_profiles.id = auth.uid() and user_profiles.role = 'admin')
  );

create policy admin_read_stock_adjustments on public.stock_adjustments
  for select using (
    exists (select 1 from user_profiles where user_profiles.id = auth.uid() and user_profiles.role = 'admin')
  );

-- stock_adjustments foi criada com DML completo para anon e authenticated
-- (INSERT/UPDATE/DELETE/TRUNCATE). Hoje o RLS sem policy segurava tudo; com
-- policy no lugar, o grant vira o que decide. Ninguém escreve nessa tabela fora
-- do service role — lib/actions/products.ts e lib/actions/raw-materials.ts, os
-- únicos pontos de escrita, usam createServiceClient.
revoke insert, update, delete, truncate on public.stock_adjustments from anon, authenticated;
revoke select on public.stock_adjustments from anon;

-- coupon_usages e notification_reads já não tinham DML para anon/authenticated:
-- nada a revogar nelas.
