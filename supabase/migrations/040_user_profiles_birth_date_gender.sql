-- 040 — Dados opcionais do perfil: data de nascimento e gênero.
--
-- Campos que a cliente preenche depois da compra, na área /conta. Ambos nullable:
-- ninguém é obrigado a informar, e a NF-e não usa nenhum dos dois.
--
-- O grant por coluna da migration 039 é uma lista fechada — coluna nova não entra
-- sozinha. Sem reemitir o grant, a cliente edita, a tela diz "salvo" e o valor não
-- grava, que é exatamente o bug que a 039 veio corrigir.

alter table user_profiles
  add column if not exists birth_date date,
  add column if not exists gender     text;

comment on column user_profiles.birth_date is 'Opcional, informado pela cliente em /conta';
comment on column user_profiles.gender is 'Opcional, texto livre — sem lista fixa';

revoke update on user_profiles from authenticated;
grant update (name, phone, cpf, birth_date, gender) on user_profiles to authenticated;
