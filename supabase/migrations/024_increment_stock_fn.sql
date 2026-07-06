-- Função atômica de estorno/entrada de estoque de produto acabado.
-- Usada no cancelamento de pedidos pagos (reason 'devolucao') — espelho da
-- decrement_stock criada na migration 001.

create or replace function increment_stock(
  p_variant_id uuid,
  p_quantity   integer,
  p_reason     text default 'devolucao',
  p_notes      text default null
) returns void language plpgsql as $$
declare
  v_before integer;
begin
  if p_quantity <= 0 then
    raise exception 'Quantidade inválida para estorno: %', p_quantity;
  end if;

  select stock_quantity into v_before
  from product_variants
  where id = p_variant_id
  for update;

  if v_before is null then
    raise exception 'Variante % não encontrada', p_variant_id;
  end if;

  update product_variants
  set stock_quantity = stock_quantity + p_quantity
  where id = p_variant_id;

  insert into stock_adjustments
    (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
  values
    ('product_variant', p_variant_id, v_before, v_before + p_quantity, p_quantity, p_reason, p_notes, 'sistema');
end;
$$;
