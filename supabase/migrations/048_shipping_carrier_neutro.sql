-- Camada neutra de transportadora (Fase 1 da integração direta com os Correios).
--
-- O pedido passa a dizer POR QUEM foi despachado, em vez de assumir Melhor Envio.
-- As colunas melhor_envio_* NÃO são removidas: o painel liga o botão de imprimir
-- etiqueta por melhor_envio_order_id, e pedido histórico não pode perder o botão.
-- Elas continuam sendo escritas para pedido do ME; param de ser a única verdade.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_carrier      text,   -- 'correios' | 'melhor-envio'
  ADD COLUMN IF NOT EXISTS shipping_service_code text,   -- '03298' (Correios) | '1' (ME)
  ADD COLUMN IF NOT EXISTS shipment_id           text;   -- id da pré-postagem / do envio no ME

-- Remetente da etiqueta é identidade própria: o contrato dos Correios está no CNPJ
-- do titular, que não é o CNPJ que emite a nota. Vazio = usa a identidade fiscal.
-- Quem lê estes campos é a Fase 3 — entram agora porque a migration é uma só.
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS carrier_sender_name text,
  ADD COLUMN IF NOT EXISTS carrier_sender_cnpj text;

-- Backfill: pedido com vínculo no ME passa a declarar isso nas colunas novas.
UPDATE orders SET
  shipping_carrier      = 'melhor-envio',
  shipping_service_code = melhor_envio_service_id::text,
  shipment_id           = melhor_envio_order_id
WHERE (melhor_envio_service_id IS NOT NULL OR melhor_envio_order_id IS NOT NULL)
  AND shipping_carrier IS NULL;

COMMENT ON COLUMN orders.shipping_carrier IS
  'Quem despachou: ''correios'' (contrato direto) ou ''melhor-envio''. Hífen em todo lugar — é o mesmo texto que vai no id composto da opção de frete.';
COMMENT ON COLUMN orders.shipping_service_code IS
  'Código do serviço na transportadora: ''03298'' PAC, ''03220'' SEDEX, ''04227'' Mini Envios nos Correios; o service id no ME.';
COMMENT ON COLUMN orders.shipment_id IS
  'Id do envio na transportadora: a pré-postagem nos Correios, o pedido do carrinho no ME.';
