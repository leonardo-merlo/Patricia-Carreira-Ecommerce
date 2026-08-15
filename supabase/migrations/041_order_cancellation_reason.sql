-- 041 — Motivo de cancelamento de pedido
--
-- Até aqui cancelar era um estado sem explicação: o pedido virava 'cancelled' e a
-- razão morria na cabeça de quem clicou. Guardar o motivo como slug (e não como
-- rótulo) é o que deixa o dado consultável depois — "quantos cancelamentos por
-- falta de estoque no trimestre" só responde se a coluna tiver valores fechados.

alter table public.orders
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_notes  text;

-- Lista fechada. NULL continua válido: todo pedido não cancelado tem NULL aqui,
-- e os cancelamentos antigos ficaram sem motivo registrado.
alter table public.orders
  drop constraint if exists orders_cancellation_reason_check;

alter table public.orders
  add constraint orders_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in (
      'duplicado',
      'desistencia',
      'sem_estoque',
      'endereco_incorreto',
      'fraude',
      'outro'
    )
  );

comment on column public.orders.cancellation_reason is
  'Slug do motivo de cancelamento. NULL para pedido não cancelado.';
comment on column public.orders.cancellation_notes is
  'Observação livre do cancelamento, opcional.';

-- Os grants de orders são table-level (não uma lista fechada de colunas), então
-- as colunas novas já entram cobertas. Confirmado antes de aplicar.
