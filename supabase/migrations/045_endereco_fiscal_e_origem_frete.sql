-- 045 — separa endereço fiscal do emitente e endereço de origem do frete.
--
-- Até aqui as duas coisas eram as MESMAS variáveis STORE_* na Vercel. Com a sede
-- em Minas Gerais e a loja em Arraial d'Ajuda elas deixaram de coincidir: a nota
-- saía com a UF errada e toda venda para a Bahia com CFOP 5102 em vez de 6102.
--
-- Três blocos, porque são três coisas e não duas:
--   1. identidade jurídica — uma só; o emitente da NF-e e o remetente da etiqueta
--      são a mesma PJ (era o que duplicava STORE_CNPJ e STORE_DOCUMENTO);
--   2. endereço fiscal — sai do cartão CNPJ, define o CFOP;
--   3. origem do frete — de onde a mercadoria sai fisicamente.

alter table public.store_settings
  -- 1. Identidade jurídica
  add column if not exists legal_name            text,
  add column if not exists state_registration    text,
  add column if not exists cnae                  text,
  add column if not exists tax_regime            smallint not null default 1,

  -- 2. Endereço fiscal (cartão CNPJ)
  add column if not exists fiscal_street         text,
  add column if not exists fiscal_number         text,
  add column if not exists fiscal_complement     text,
  add column if not exists fiscal_district       text,
  add column if not exists fiscal_city           text,
  add column if not exists fiscal_state          text,
  add column if not exists fiscal_zip            text,

  -- 3. Origem do frete. O CEP já morava aqui como origin_cep e continua com esse
  -- nome: renomear quebraria a tela de envio e a cotação sem ganhar nada.
  add column if not exists origin_same_as_fiscal boolean not null default true,
  add column if not exists origin_street         text,
  add column if not exists origin_number         text,
  add column if not exists origin_complement     text,
  add column if not exists origin_district       text,
  add column if not exists origin_city           text,
  add column if not exists origin_state          text,
  add column if not exists origin_contact_name   text,
  add column if not exists origin_phone          text,
  add column if not exists origin_email          text;

comment on column public.store_settings.origin_same_as_fiscal is
  'Ligado: a origem do frete É o endereço fiscal. Existe para impedir a falha por omissão — corrigir o endereço fiscal e esquecer o de frete.';
comment on column public.store_settings.cnpj is
  'CNPJ canônico da empresa: emitente da NF-e e remetente no Melhor Envio. Guardado só com dígitos; a formatação é feita na exibição.';

-- UF é sigla de 2 letras maiúsculas. Vazio é aceito de propósito: enquanto o
-- cartão CNPJ não chega, o campo fica em branco e o formulário precisa salvar.
alter table public.store_settings
  drop constraint if exists store_settings_fiscal_state_uf,
  add  constraint store_settings_fiscal_state_uf
    check (fiscal_state is null or fiscal_state = '' or fiscal_state ~ '^[A-Z]{2}$');

alter table public.store_settings
  drop constraint if exists store_settings_origin_state_uf,
  add  constraint store_settings_origin_state_uf
    check (origin_state is null or origin_state = '' or origin_state ~ '^[A-Z]{2}$');

-- Backfill do que é fato verificado, e só disso.
--
-- O endereço fiscal fica VAZIO: ele sai do cartão CNPJ, que ainda não chegou, e
-- chutar Porto Seguro/BA aqui seria gravar o erro que esta migration existe para
-- desfazer. A emissão falha nomeando o campo até alguém preencher — que é o
-- comportamento correto para documento fiscal.
--
-- A origem recebe o que já está documentado no projeto e confirmado: Arraial
-- d'Ajuda, distrito de Porto Seguro/BA. Logradouro e número seguem em branco;
-- enquanto o bloco estiver incompleto o código usa as variáveis antigas, então a
-- etiqueta continua saindo normalmente.
update public.store_settings
set
  origin_same_as_fiscal = false,   -- para esta loja já se sabe que diferem
  origin_district       = coalesce(nullif(origin_district, ''), 'Arraial d''Ajuda'),
  origin_city           = coalesce(nullif(origin_city, ''),     'Porto Seguro'),
  origin_state          = coalesce(nullif(origin_state, ''),    'BA'),
  updated_at            = now();

-- O CNPJ NÃO é preenchido aqui de propósito, mesmo estando medido em produção
-- (38142237000180). O rodapé da loja exibe store_settings.cnpj assim que ele
-- existe, e a formatação para exibição só chega com o deploy deste código —
-- gravar agora poria o número cru no ar antes disso. Ele entra junto com o resto
-- dos dados fiscais em /admin/config/fiscal, depois do deploy. Até lá, o
-- remetente do frete continua usando STORE_CNPJ da Vercel.
