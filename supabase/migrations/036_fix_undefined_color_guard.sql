-- Migration 036: corrige a trava de cor indefinida introduzida na 035
--
-- Bug: o bloco 0 de complete_production_order marcava como "sem cor" qualquer
-- linha com required_color NULL. Só que insumo de cor fixa (Aplicações, Metais,
-- Aviamentos) tem required_color NULL por definição — a cor dele não vem da
-- variante. Resultado: TODA OP era recusada, com uma mensagem mandando definir a
-- cor de "Aplicações; Aviamentos; Metais".
--
-- A confusão está em qual material_category se olha. O que a função devolve é
-- COALESCE(insumo.category, receita.material_category): num insumo fixo isso é a
-- categoria do próprio insumo, não uma categoria de corte. A checagem passa a
-- confrontar com cut_categories, que é quem sabe o que exige cor.

CREATE OR REPLACE FUNCTION public.complete_production_order(p_op_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant_id uuid;
  v_status     text;
  v_qty        integer;
  v_missing    text := '';
  v_unresolved text := '';
  v_undefined  text := '';
  r            record;
  v_before     numeric;
  v_after      numeric;
BEGIN
  SELECT product_variant_id, status, quantity_requested
    INTO v_variant_id, v_status, v_qty
    FROM public.production_orders
    WHERE id = p_op_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OP não encontrada';
  END IF;
  IF v_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'OP já está %', v_status;
  END IF;
  IF v_variant_id IS NULL THEN
    RAISE EXCEPTION 'OP sem variante de produto';
  END IF;

  -- 0) Toda categoria de CORTE precisa ter cor de verdade escolhida na variante.
  --    Insumo de cor fixa não entra nesta checagem.
  FOR r IN
    SELECT DISTINCT b.material_category
    FROM public.resolve_variant_bom(v_variant_id) b
    JOIN public.cut_categories cc ON cc.category = b.material_category
    WHERE b.is_placeholder OR b.required_color IS NULL
  LOOP
    v_undefined := v_undefined || r.material_category || '; ';
  END LOOP;

  IF v_undefined <> '' THEN
    RAISE EXCEPTION 'Defina a cor da variante antes de produzir: %', v_undefined;
  END IF;

  -- 1) Todo item da receita precisa existir na cor da variante
  FOR r IN
    SELECT material_category, material_type, required_color
    FROM public.resolve_variant_bom(v_variant_id)
    WHERE NOT resolved
  LOOP
    v_unresolved := v_unresolved || r.material_category || ' › ' || r.material_type
      || COALESCE(' › ' || r.required_color, '') || '; ';
  END LOOP;

  IF v_unresolved <> '' THEN
    RAISE EXCEPTION 'Insumos não cadastrados na cor desta variante: %', v_unresolved;
  END IF;

  -- 2) Verifica suficiência de TODOS os materiais antes de mexer em qualquer um
  FOR r IN
    SELECT material_name, required_color, unit, stock_quantity,
           (quantity_needed * v_qty) AS needed
    FROM public.resolve_variant_bom(v_variant_id)
  LOOP
    IF r.stock_quantity < r.needed THEN
      v_missing := v_missing || r.material_name
        || COALESCE(' (' || r.required_color || ')', '') || ' — falta '
        || public.format_qty(r.needed - r.stock_quantity) || ' ' || r.unit || '; ';
    END IF;
  END LOOP;

  IF v_missing <> '' THEN
    RAISE EXCEPTION 'Materiais insuficientes: %', v_missing;
  END IF;

  -- 3) Decrementa matérias-primas + registra ajuste
  FOR r IN
    SELECT raw_material_id, stock_quantity, (quantity_needed * v_qty) AS needed
    FROM public.resolve_variant_bom(v_variant_id)
  LOOP
    v_before := r.stock_quantity;
    v_after  := v_before - r.needed;
    UPDATE public.raw_materials
      SET stock_quantity = v_after, updated_at = now()
      WHERE id = r.raw_material_id;
    INSERT INTO public.stock_adjustments
      (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
    VALUES
      ('raw_material', r.raw_material_id, v_before, v_after, -r.needed,
       'producao_concluida', 'OP ' || p_op_id, 'henrique');
  END LOOP;

  -- 4) Incrementa produto acabado + registra ajuste
  SELECT stock_quantity INTO v_before FROM public.product_variants WHERE id = v_variant_id FOR UPDATE;
  v_after := v_before + v_qty;
  UPDATE public.product_variants SET stock_quantity = v_after WHERE id = v_variant_id;
  INSERT INTO public.stock_adjustments
    (target, target_id, quantity_before, quantity_after, delta, reason, notes, created_by)
  VALUES
    ('product_variant', v_variant_id, v_before, v_after, v_qty, 'producao_concluida', 'OP ' || p_op_id, 'henrique');

  -- 5) Conclui a OP
  UPDATE public.production_orders
    SET status = 'completed', quantity_produced = v_qty
    WHERE id = p_op_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_production_order(uuid) TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';
