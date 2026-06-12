-- Migration 019: conclusão de OP com baixa de estoque atômica
-- Decrementa matéria-prima (BOM × qtd), incrementa produto acabado, registra
-- em stock_adjustments e conclui a OP — tudo em uma única transação.
-- Bloqueia (rollback) se faltar qualquer matéria-prima.

create or replace function public.complete_production_order(p_op_id uuid)
returns void
language plpgsql
as $$
declare
  v_variant_id uuid;
  v_status     text;
  v_qty        integer;
  v_missing    text := '';
  r            record;
  v_before     numeric;
  v_after      numeric;
begin
  select product_variant_id, status, quantity_requested
    into v_variant_id, v_status, v_qty
    from public.production_orders
    where id = p_op_id
    for update;

  if not found then
    raise exception 'OP não encontrada';
  end if;
  if v_status in ('completed', 'cancelled') then
    raise exception 'OP já está %', v_status;
  end if;
  if v_variant_id is null then
    raise exception 'OP sem variante de produto';
  end if;

  -- 1) Verifica suficiência de TODOS os materiais antes de mexer em qualquer um
  for r in
    select rm.name, rm.unit, rm.stock_quantity, (b.quantity_needed * v_qty) as needed
    from public.bill_of_materials b
    join public.raw_materials rm on rm.id = b.raw_material_id
    where b.product_variant_id = v_variant_id
  loop
    if r.stock_quantity < r.needed then
      v_missing := v_missing || r.name || ' (falta '
        || to_char(r.needed - r.stock_quantity, 'FM999999990.999') || ' ' || r.unit || '); ';
    end if;
  end loop;

  if v_missing <> '' then
    raise exception 'Materiais insuficientes: %', v_missing;
  end if;

  -- 2) Decrementa matérias-primas + registra ajuste
  for r in
    select rm.id, rm.stock_quantity, (b.quantity_needed * v_qty) as needed
    from public.bill_of_materials b
    join public.raw_materials rm on rm.id = b.raw_material_id
    where b.product_variant_id = v_variant_id
  loop
    v_before := r.stock_quantity;
    v_after  := v_before - r.needed;
    update public.raw_materials set stock_quantity = v_after, updated_at = now() where id = r.id;
    insert into public.stock_adjustments
      (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
    values
      ('raw_material', r.id, v_before, v_after, -r.needed, 'producao_concluida', 'OP ' || p_op_id, 'henrique');
  end loop;

  -- 3) Incrementa produto acabado + registra ajuste
  select stock_quantity into v_before from public.product_variants where id = v_variant_id for update;
  v_after := v_before + v_qty;
  update public.product_variants set stock_quantity = v_after where id = v_variant_id;
  insert into public.stock_adjustments
    (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
  values
    ('product_variant', v_variant_id, v_before, v_after, v_qty, 'producao_concluida', 'OP ' || p_op_id, 'henrique');

  -- 4) Conclui a OP
  update public.production_orders
    set status = 'completed', quantity_produced = v_qty
    where id = p_op_id;
end;
$$;

grant execute on function public.complete_production_order(uuid) to service_role;
grant execute on function public.complete_production_order(uuid) to authenticated;
