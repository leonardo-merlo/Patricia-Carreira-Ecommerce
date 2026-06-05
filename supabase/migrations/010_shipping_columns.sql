-- Colunas para integração Melhor Envio na tabela orders
-- melhor_envio_service_id: ID do serviço escolhido no checkout (ex: 1 = Correios PAC)
-- melhor_envio_order_id:   ID do pedido no sistema do Melhor Envio (após addToCart)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS melhor_envio_service_id integer,
  ADD COLUMN IF NOT EXISTS melhor_envio_order_id text;
