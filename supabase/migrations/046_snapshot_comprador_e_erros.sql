-- 046 — o pedido guarda quem comprou, e guarda por que falhou.
--
-- Dois problemas achados no mesmo lugar:
--
-- 1. O pedido não guardava nada do comprador: só um ponteiro para `customers`.
--    Como o checkout atualiza esse cadastro a cada compra, renomear o cliente
--    reescrevia o nome de TODOS os pedidos antigos dele — inclusive os que já
--    tinham nota fiscal emitida com o nome anterior. O projeto já trata preço
--    como snapshot imutável (regra 2); faltava tratar o comprador do mesmo jeito.
--
-- 2. Quando a emissão da NF-e ou a compra da etiqueta falhava, a mensagem ia
--    para o console do servidor e morria. A tela mostrava "erro" sem motivo, e
--    nem pelo banco dava para saber o que tinha acontecido.

alter table public.orders
  -- 1. Comprador congelado no momento da compra. É o que foi para a nota fiscal
  --    e para a etiqueta, e não muda mais.
  add column if not exists buyer_name     text,
  add column if not exists buyer_email    text,
  add column if not exists buyer_phone    text,
  add column if not exists buyer_cpf_cnpj text,
  add column if not exists buyer_address  jsonb,

  -- 2. Por que falhou. Texto para pessoa ler, não código.
  add column if not exists nfe_error      text,
  add column if not exists shipping_error text;

comment on column public.orders.buyer_name is
  'Nome de quem comprou, no momento da compra. Imutavel: e o nome que foi para a NF-e e para a etiqueta. Nao seguir customers.name, que muda a cada checkout.';
comment on column public.orders.buyer_address is
  'Endereco de entrega usado NESTE pedido: {street, number, complement, neighborhood, city, state, zip}.';
comment on column public.orders.nfe_error is
  'Ultima mensagem de falha da emissao. Limpa quando a nota e autorizada.';

-- Backfill com o melhor dado disponível: o cadastro atual do cliente.
--
-- Não é fiel para os pedidos cujo cadastro já foi renomeado — esse dado foi
-- sobrescrito e não existe mais em lugar nenhum. É o melhor que dá para fazer, e
-- a partir daqui cada pedido novo nasce com o seu próprio.
update public.orders o
set buyer_name     = coalesce(o.buyer_name, c.name),
    buyer_email    = coalesce(o.buyer_email, c.email),
    buyer_phone    = coalesce(o.buyer_phone, c.phone),
    buyer_cpf_cnpj = coalesce(o.buyer_cpf_cnpj, c.cpf_cnpj),
    buyer_address  = coalesce(o.buyer_address, c.address)
from public.customers c
where c.id = o.customer_id
  and o.buyer_name is null;
