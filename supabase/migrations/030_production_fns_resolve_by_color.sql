-- Migration 030: funções de produção passam a resolver a receita por cor
--
-- complete_production_order e revert_production_order liam bill_of_materials
-- direto por product_variant_id. Com a receita no produto (migration 029), as
-- duas passam a usar resolve_variant_bom(), que aplica as cores da variante.
--
-- Novo comportamento: se a receita tem um corte cuja cor não está cadastrada
-- em raw_materials, a conclusão da OP é bloqueada — antes esse item simplesmente
-- não existiria e a OP concluiria com baixa incompleta.

create or replace function public.complete_production_order(p_op_id uuid)
returns void
language plpgsql
as $$
declare
  v_variant_id uuid;
  v_status     text;
  v_qty        integer;
  v_missing    text := '';
  v_unresolved text := '';
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

  -- 1) Todo item da receita precisa existir na cor da variante
  for r in
    select material_category, material_type, required_color
    from public.resolve_variant_bom(v_variant_id)
    where not resolved
  loop
    v_unresolved := v_unresolved || r.material_category || ' › ' || r.material_type
      || coalesce(' › ' || r.required_color, '') || '; ';
  end loop;

  if v_unresolved <> '' then
    raise exception 'Insumos não cadastrados na cor desta variante: %', v_unresolved;
  end if;

  -- 2) Verifica suficiência de TODOS os materiais antes de mexer em qualquer um
  for r in
    select material_name, required_color, unit, stock_quantity,
           (quantity_needed * v_qty) as needed
    from public.resolve_variant_bom(v_variant_id)
  loop
    if r.stock_quantity < r.needed then
      v_missing := v_missing || r.material_name
        || coalesce(' (' || r.required_color || ')', '') || ' — falta '
        || to_char(r.needed - r.stock_quantity, 'FM999999990.999') || ' ' || r.unit || '; ';
    end if;
  end loop;

  if v_missing <> '' then
    raise exception 'Materiais insuficientes: %', v_missing;
  end if;

  -- 3) Decrementa matérias-primas + registra ajuste
  for r in
    select raw_material_id, stock_quantity, (quantity_needed * v_qty) as needed
    from public.resolve_variant_bom(v_variant_id)
  loop
    v_before := r.stock_quantity;
    v_after  := v_before - r.needed;
    update public.raw_materials
      set stock_quantity = v_after, updated_at = now()
      where id = r.raw_material_id;
    insert into public.stock_adjustments
      (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
    values
      ('raw_material', r.raw_material_id, v_before, v_after, -r.needed,
       'producao_concluida', 'OP ' || p_op_id, 'henrique');
  end loop;

  -- 4) Incrementa produto acabado + registra ajuste
  select stock_quantity into v_before from public.product_variants where id = v_variant_id for update;
  v_after := v_before + v_qty;
  update public.product_variants set stock_quantity = v_after where id = v_variant_id;
  insert into public.stock_adjustments
    (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
  values
    ('product_variant', v_variant_id, v_before, v_after, v_qty, 'producao_concluida', 'OP ' || p_op_id, 'henrique');

  -- 5) Conclui a OP
  update public.production_orders
    set status = 'completed', quantity_produced = v_qty
    where id = p_op_id;
end;
$$;

grant execute on function public.complete_production_order(uuid) to service_role;
grant execute on function public.complete_production_order(uuid) to authenticated;


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

  -- 1) Devolve matéria-prima (só o que resolveu — item sem cadastro não teve baixa)
  if v_variant_id is not null then
    for r in
      select raw_material_id, stock_quantity, (quantity_needed * v_qty) as qty
      from public.resolve_variant_bom(v_variant_id)
      where resolved
    loop
      v_before := r.stock_quantity;
      v_after  := v_before + r.qty;
      update public.raw_materials
        set stock_quantity = v_after, updated_at = now()
        where id = r.raw_material_id;
      insert into public.stock_adjustments
        (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
      values
        ('raw_material', r.raw_material_id, v_before, v_after, r.qty,
         'estorno_producao', 'Estorno OP ' || p_op_id, 'henrique');
    end loop;
  end if;

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

NOTIFY pgrst, 'reload schema';
