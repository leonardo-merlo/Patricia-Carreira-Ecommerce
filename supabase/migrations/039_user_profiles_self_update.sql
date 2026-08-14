-- 039 — Cliente pode editar o próprio perfil.
--
-- user_profiles só tinha policy de SELECT. updateProfileName usa o client do
-- usuário (sujeito a RLS), então o UPDATE casava com zero linhas e o Postgres
-- devolvia sucesso sem erro: a tela fechava o editor e o nome continuava o antigo.
--
-- A policy sozinha não basta. Com UPDATE liberado na linha inteira, a cliente
-- poderia gravar role = 'admin' em si mesma e entrar no painel. O GRANT por
-- coluna é o que fecha isso: role não está na lista, então nem a policy alcança.

alter table user_profiles enable row level security;

drop policy if exists customer_update_own_profile on user_profiles;

create policy customer_update_own_profile
  on user_profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Privilégio por coluna: authenticated só enxerga name/phone/cpf no UPDATE.
-- Uma tentativa de alterar role falha no privilégio, antes da RLS.
revoke update on user_profiles from authenticated;
grant update (name, phone, cpf) on user_profiles to authenticated;
