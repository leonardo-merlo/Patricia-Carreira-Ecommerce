-- Substitui a tabela affiliate_payments (migration 026) por uma ligação direta
-- com accounts_payable, pra comissão de afiliada virar "conta a pagar" de
-- verdade e entrar no cálculo de resultado do mês no Financeiro.
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS reference_month text; -- 'YYYY-MM', só usado em contas de comissão

-- Constraint "cheia" (não parcial): linhas com partner_id/reference_month NULL
-- não conflitam entre si (regra padrão do Postgres pra UNIQUE com NULL), e o
-- PostgREST/.upsert(onConflict:) só sabe mirar num arbiter não-parcial.
ALTER TABLE accounts_payable ADD CONSTRAINT accounts_payable_partner_month_uniq UNIQUE (partner_id, reference_month);

DROP TABLE IF EXISTS affiliate_payments;

-- Marca produtos disponíveis pra afiliadas divulgarem no portal (aba "Divulgar").
-- Começa tudo false — Henrique marca manualmente pelo cadastro de produto.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_affiliate_promo boolean NOT NULL DEFAULT false;
