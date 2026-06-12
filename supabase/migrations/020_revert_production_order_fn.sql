-- Migration 020: estorno de OP concluída (ao arrastar de volta no kanban)
-- Desfaz a baixa: devolve matéria-prima, remove o produto acabado, registra
-- em stock_adjustments e volta o status. Bloqueia se o produto já saiu do estoque.

create or replace function public.revert_production_order(p_op_id uuid, p_target_status text)
returns void
language plpgsql
as $$
declare
  v_variant_id    uuid;
  v_status        text;
  v_qty           integer;
  r               record;
  v_before        numeric;
  v_after         numeric;
  v_variant_stock numeric;
begin
  if p_target_status not in ('draft', 'approved', 'in_progress') then
    raise exception 'Status de destino inválido para estorno: %', p_target_status;
  end if;

  select product_variant_id, status, quantity_produced
    into v_variant_id, v_status, v_qty
    from public.production_orders
    where id = p_op_id
    for update;

  if not found then
    raise exception 'OP não encontrada';
  end if;
  if v_status <> 'completed' then
    raise exception 'Só é possível estornar uma OP concluída';
  end if;

  -- Guard: o produto acabado precisa ter saldo para estornar (pode já ter sido vendido)
  if v_variant_id is not null then
    select stock_quantity into v_variant_stock from public.product_variants where id = v_variant_id for update;
    if v_variant_stock < v_qty then
      raise exception 'Não é possível estornar: % unidade(s) do produto já saíram do estoque (saldo atual %)', v_qty, v_variant_stock;
    end if;
  end if;

  -- 1) Devolve matéria-prima
  for r in
    select rm.id, rm.stock_quantity, (b.quantity_needed * v_qty) as qty
    from public.bill_of_materials b
    join public.raw_materials rm on rm.id = b.raw_material_id
    where b.product_variant_id = v_variant_id
  loop
    v_before := r.stock_quantity;
    v_after  := v_before + r.qty;
    update public.raw_materials set stock_quantity = v_after, updated_at = now() where id = r.id;
    insert into public.stock_adjustments
      (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
    values
      ('raw_material', r.id, v_before, v_after, r.qty, 'estorno_producao', 'Estorno OP ' || p_op_id, 'henrique');
  end loop;

  -- 2) Remove o produto acabado
  if v_variant_id is not null then
    v_before := v_variant_stock;
    v_after  := v_before - v_qty;
    update public.product_variants set stock_quantity = v_after where id = v_variant_id;
    insert into public.stock_adjustments
      (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
    values
      ('product_variant', v_variant_id, v_before, v_after, -v_qty, 'estorno_producao', 'Estorno OP ' || p_op_id, 'henrique');
  end if;

  -- 3) Volta o status e zera quantity_produced
  update public.production_orders
    set status = p_target_status, quantity_produced = 0
    where id = p_op_id;
end;
$$;

grant execute on function public.revert_production_order(uuid, text) to service_role;
grant execute on function public.revert_production_order(uuid, text) to authenticated;
