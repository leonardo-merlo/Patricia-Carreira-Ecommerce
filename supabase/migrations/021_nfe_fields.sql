-- Campos para integração Focus NFe
-- orders:
--   nfe_status: estado do documento (pending | processando | autorizado | erro | cancelado | denegado)
--   nfe_access_key: chave de acesso com 44 dígitos
-- products:
--   ncm: código NCM com 8 dígitos (ex: "42022200" para bolsas)
--   cfop: código fiscal de operação (ex: "6102" para venda interestadual)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS nfe_status text DEFAULT 'pending' CHECK (nfe_status IN ('pending', 'processando', 'autorizado', 'erro', 'cancelado', 'denegado')),
  ADD COLUMN IF NOT EXISTS nfe_access_key text;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS cfop text DEFAULT '6102';
