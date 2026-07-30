-- Migration 031: insumos e receitas das 5 bolsas (fichas técnicas do Henrique)
--
-- Nomes e quantidades exatamente como nas fichas. Cortes com o mesmo nome são
-- o mesmo insumo entre bolsas ("Frente" da lona serve Nirvana, Lyra, Liberty,
-- Flora e Mandala) — o que muda é a cor, declarada na variante.
--
-- Todos entram como 'bruta': o Henrique não controla o rolo de lona/couro a
-- montante, então um corte em falta deve aparecer como item a repor, não como
-- item a produzir a partir de outro insumo.
--
-- Estoque inicial 0 — o Henrique faz o inventário pelo painel.
--
-- Divergência conhecida: a ficha da Flora declara "CORTE COURO (13 peças)", mas
-- os itens somam 15 (4+4+2+2+1+2). O Henrique confirmou que 15 está certo e o
-- cabeçalho é que estava errado.
--
-- Os insumos de corte NÃO entram aqui: cada um existe por cor, e as cores de
-- cada variante ainda serão definidas pelo Henrique no painel. A receita já
-- referencia os cortes por categoria+tipo, então basta cadastrar os insumos nas
-- cores certas depois (botão "cadastrar cortes pendentes" em matérias-primas).

-- ─── Aplicações (cor fixa) ───────────────────────────────────────────────────
INSERT INTO public.raw_materials (name, type, category, type_specific, color, unit, stock_quantity, minimum_stock) VALUES
  ('Nirvana A', 'bruta', 'Aplicações', 'Nirvana A', NULL, 'unidade', 0, 0),
  ('Nirvana B', 'bruta', 'Aplicações', 'Nirvana B', NULL, 'unidade', 0, 0),
  ('Nirvana C', 'bruta', 'Aplicações', 'Nirvana C', NULL, 'unidade', 0, 0),
  ('Nirvana D', 'bruta', 'Aplicações', 'Nirvana D', NULL, 'unidade', 0, 0),
  ('Nirvana E', 'bruta', 'Aplicações', 'Nirvana E', NULL, 'unidade', 0, 0),
  ('Nirvana F', 'bruta', 'Aplicações', 'Nirvana F', NULL, 'unidade', 0, 0),
  ('Lyra A',    'bruta', 'Aplicações', 'Lyra A',    NULL, 'unidade', 0, 0),
  ('Lyra B',    'bruta', 'Aplicações', 'Lyra B',    NULL, 'unidade', 0, 0),
  ('Liberty A', 'bruta', 'Aplicações', 'Liberty A', NULL, 'unidade', 0, 0),
  ('Liberty B', 'bruta', 'Aplicações', 'Liberty B', NULL, 'unidade', 0, 0),
  ('Liberty C', 'bruta', 'Aplicações', 'Liberty C', NULL, 'unidade', 0, 0),
  ('Liberty D', 'bruta', 'Aplicações', 'Liberty D', NULL, 'unidade', 0, 0),
  ('Liberty E', 'bruta', 'Aplicações', 'Liberty E', NULL, 'unidade', 0, 0),
  ('Liberty F', 'bruta', 'Aplicações', 'Liberty F', NULL, 'unidade', 0, 0),
  ('Flora A',   'bruta', 'Aplicações', 'Flora A',   NULL, 'unidade', 0, 0),
  ('Flora B',   'bruta', 'Aplicações', 'Flora B',   NULL, 'unidade', 0, 0),
  ('Flora C',   'bruta', 'Aplicações', 'Flora C',   NULL, 'unidade', 0, 0),
  ('Flora D',   'bruta', 'Aplicações', 'Flora D',   NULL, 'unidade', 0, 0),
  ('Flora E',   'bruta', 'Aplicações', 'Flora E',   NULL, 'unidade', 0, 0),
  ('Mandala A', 'bruta', 'Aplicações', 'Mandala A', NULL, 'unidade', 0, 0),
  ('Mandala B', 'bruta', 'Aplicações', 'Mandala B', NULL, 'unidade', 0, 0),
  ('Mandala C', 'bruta', 'Aplicações', 'Mandala C', NULL, 'unidade', 0, 0),
  ('Mandala D', 'bruta', 'Aplicações', 'Mandala D', NULL, 'unidade', 0, 0),
  ('Mandala E', 'bruta', 'Aplicações', 'Mandala E', NULL, 'unidade', 0, 0),
  ('Mandala F', 'bruta', 'Aplicações', 'Mandala F', NULL, 'unidade', 0, 0),
  ('Mandala G', 'bruta', 'Aplicações', 'Mandala G', NULL, 'unidade', 0, 0),
  ('Mandala H', 'bruta', 'Aplicações', 'Mandala H', NULL, 'unidade', 0, 0);

-- ─── Metais ──────────────────────────────────────────────────────────────────
INSERT INTO public.raw_materials (name, type, category, type_specific, color, unit, stock_quantity, minimum_stock) VALUES
  ('Rebite',              'bruta', 'Metais', 'Rebite',              NULL, 'unidade', 0, 0),
  ('Meia argola 1,5 cm',  'bruta', 'Metais', 'Meia argola 1,5 cm',  NULL, 'unidade', 0, 0),
  ('Argola G',            'bruta', 'Metais', 'Argola G',            NULL, 'unidade', 0, 0),
  ('Mosquetão G',         'bruta', 'Metais', 'Mosquetão G',         NULL, 'unidade', 0, 0),
  ('Mosquetão médio',     'bruta', 'Metais', 'Mosquetão médio',     NULL, 'unidade', 0, 0),
  ('Mosquetão P',         'bruta', 'Metais', 'Mosquetão P',         NULL, 'unidade', 0, 0),
  ('Cursor diamante',     'bruta', 'Metais', 'Cursor diamante',     NULL, 'unidade', 0, 0),
  ('Ímã',                 'bruta', 'Metais', 'Ímã',                 NULL, 'unidade', 0, 0);

-- ─── Aviamentos ──────────────────────────────────────────────────────────────
INSERT INTO public.raw_materials (name, type, category, type_specific, color, unit, stock_quantity, minimum_stock) VALUES
  ('Fecho metro 20 cm',      'bruta', 'Aviamentos', 'Fecho metro 20 cm',      NULL, 'unidade', 0, 0),
  ('Fecho metro 30 cm',      'bruta', 'Aviamentos', 'Fecho metro 30 cm',      NULL, 'unidade', 0, 0),
  ('Fecho metro 40 cm',      'bruta', 'Aviamentos', 'Fecho metro 40 cm',      NULL, 'unidade', 0, 0),
  ('Fecho metro 45 cm',      'bruta', 'Aviamentos', 'Fecho metro 45 cm',      NULL, 'unidade', 0, 0),
  ('Fecho padrão 18 cm',     'bruta', 'Aviamentos', 'Fecho padrão 18 cm',     NULL, 'unidade', 0, 0),
  ('Viés 1 metro',           'bruta', 'Aviamentos', 'Viés 1 metro',           NULL, 'unidade', 0, 0),
  ('Viés 2,5 cm',            'bruta', 'Aviamentos', 'Viés 2,5 cm',            NULL, 'metro',   0, 0),
  ('Viés 3 cm',              'bruta', 'Aviamentos', 'Viés 3 cm',              NULL, 'metro',   0, 0),
  ('Gorgurão',               'bruta', 'Aviamentos', 'Gorgurão',               NULL, 'metro',   0, 0),
  ('Etiqueta bordada',       'bruta', 'Aviamentos', 'Etiqueta bordada',       NULL, 'unidade', 0, 0),
  ('Etiqueta de composição', 'bruta', 'Aviamentos', 'Etiqueta de composição', NULL, 'unidade', 0, 0);

-- ─── Receitas (por produto) ──────────────────────────────────────────────────
-- Itens de corte guardam categoria+tipo (a cor vem da variante); os demais
-- apontam o insumo direto.
WITH receita(slug, categoria, tipo, qtd) AS (VALUES
  -- ══ NIRVANA ══
  ('bolsa-nirvana', 'Corte Lona',  'Frente',                  1),
  ('bolsa-nirvana', 'Corte Lona',  'Costas',                  1),
  ('bolsa-nirvana', 'Corte Lona',  'Faixa da boca',           2),
  ('bolsa-nirvana', 'Corte Forro', 'Frente',                  1),
  ('bolsa-nirvana', 'Corte Forro', 'Costas',                  1),
  ('bolsa-nirvana', 'Corte Forro', 'Bolso de trás',           1),
  ('bolsa-nirvana', 'Corte Forro', 'Bolso de dentro',         2),
  ('bolsa-nirvana', 'Corte Forro', 'Bolso canguru',           1),
  ('bolsa-nirvana', 'Corte Couro', 'Casinha',                 2),
  ('bolsa-nirvana', 'Corte Couro', 'Boca de palhaço',         1),
  ('bolsa-nirvana', 'Corte Couro', 'Alça de couro',           1),
  ('bolsa-nirvana', 'Corte Couro', 'Tira barra alça 15 cm',   1),
  ('bolsa-nirvana', 'Corte Couro', 'Tirinha/alça 7 cm',       1),
  ('bolsa-nirvana', 'Corte Couro', 'Couro boca zíper',        1),
  ('bolsa-nirvana', 'Aplicações',  'Nirvana A',               1),
  ('bolsa-nirvana', 'Aplicações',  'Nirvana B',               1),
  ('bolsa-nirvana', 'Aplicações',  'Nirvana C',               4),
  ('bolsa-nirvana', 'Aplicações',  'Nirvana D',               2),
  ('bolsa-nirvana', 'Aplicações',  'Nirvana E',               4),
  ('bolsa-nirvana', 'Aplicações',  'Nirvana F',               2),
  ('bolsa-nirvana', 'Metais',      'Rebite',                  2),
  ('bolsa-nirvana', 'Metais',      'Meia argola 1,5 cm',      1),
  ('bolsa-nirvana', 'Metais',      'Mosquetão G',             1),
  ('bolsa-nirvana', 'Metais',      'Argola G',                1),
  ('bolsa-nirvana', 'Metais',      'Cursor diamante',         2),
  ('bolsa-nirvana', 'Aviamentos',  'Fecho metro 30 cm',       1),
  ('bolsa-nirvana', 'Aviamentos',  'Fecho metro 20 cm',       1),
  ('bolsa-nirvana', 'Aviamentos',  'Fecho padrão 18 cm',      1),
  ('bolsa-nirvana', 'Aviamentos',  'Viés 1 metro',            1),
  ('bolsa-nirvana', 'Aviamentos',  'Etiqueta bordada',        1),
  ('bolsa-nirvana', 'Aviamentos',  'Etiqueta de composição',  1),

  -- ══ LYRA ══
  ('bolsa-lyra', 'Corte Lona',  'Frente',                 1),
  ('bolsa-lyra', 'Corte Lona',  'Costas',                 1),
  ('bolsa-lyra', 'Corte Lona',  'Lateral',                2),
  ('bolsa-lyra', 'Corte Lona',  'Alça',                   2),
  ('bolsa-lyra', 'Corte Forro', 'Frente',                 1),
  ('bolsa-lyra', 'Corte Forro', 'Costas',                 1),
  ('bolsa-lyra', 'Corte Forro', 'Bolso canguru',          1),
  ('bolsa-lyra', 'Corte Forro', 'Bolso de dentro',        2),
  ('bolsa-lyra', 'Corte Couro', 'Boca de palhaço',        1),
  ('bolsa-lyra', 'Aplicações',  'Lyra A',                 3),
  ('bolsa-lyra', 'Aplicações',  'Lyra B',                12),
  ('bolsa-lyra', 'Metais',      'Ímã',                    1),
  ('bolsa-lyra', 'Aviamentos',  'Fecho padrão 18 cm',     1),
  ('bolsa-lyra', 'Aviamentos',  'Etiqueta bordada',       1),
  ('bolsa-lyra', 'Aviamentos',  'Etiqueta de composição', 1),

  -- ══ LIBERTY ══
  ('bolsa-liberty', 'Corte Lona',  'Frente',                    1),
  ('bolsa-liberty', 'Corte Lona',  'Costas',                    1),
  ('bolsa-liberty', 'Corte Lona',  'Meio',                      1),
  ('bolsa-liberty', 'Corte Lona',  'Lateral',                   2),
  ('bolsa-liberty', 'Corte Forro', 'Frente',                    1),
  ('bolsa-liberty', 'Corte Forro', 'Costas',                    1),
  ('bolsa-liberty', 'Corte Forro', 'Bolso de trás',             1),
  ('bolsa-liberty', 'Corte Forro', 'Bolso de dentro',           2),
  ('bolsa-liberty', 'Corte Forro', 'Bolso canguru',             1),
  ('bolsa-liberty', 'Corte Couro', 'Tira 48 cm',                1),
  ('bolsa-liberty', 'Corte Couro', 'Tira 43 cm',                2),
  ('bolsa-liberty', 'Corte Couro', 'Tira 20 cm',                2),
  ('bolsa-liberty', 'Corte Couro', 'Corte H',                   2),
  ('bolsa-liberty', 'Corte Couro', 'Tirinha barra alça 7 cm',   1),
  ('bolsa-liberty', 'Corte Couro', 'Casinha',                   2),
  ('bolsa-liberty', 'Aplicações',  'Liberty A',                 1),
  ('bolsa-liberty', 'Aplicações',  'Liberty B',                 1),
  ('bolsa-liberty', 'Aplicações',  'Liberty C',                 3),
  ('bolsa-liberty', 'Aplicações',  'Liberty D',                 8),
  ('bolsa-liberty', 'Aplicações',  'Liberty E',                 3),
  ('bolsa-liberty', 'Aplicações',  'Liberty F',                 1),
  ('bolsa-liberty', 'Metais',      'Cursor diamante',           2),
  ('bolsa-liberty', 'Metais',      'Rebite',                    7),
  ('bolsa-liberty', 'Metais',      'Meia argola 1,5 cm',        1),
  ('bolsa-liberty', 'Metais',      'Mosquetão médio',           1),
  ('bolsa-liberty', 'Metais',      'Argola G',                  2),
  ('bolsa-liberty', 'Aviamentos',  'Fecho metro 20 cm',         1),
  ('bolsa-liberty', 'Aviamentos',  'Fecho metro 45 cm',         1),
  ('bolsa-liberty', 'Aviamentos',  'Fecho padrão 18 cm',        1),
  ('bolsa-liberty', 'Aviamentos',  'Etiqueta bordada',          1),
  ('bolsa-liberty', 'Aviamentos',  'Etiqueta de composição',    1),

  -- ══ FLORA ══
  ('bolsa-flora', 'Corte Lona',  'Frente',                          1),
  ('bolsa-flora', 'Corte Lona',  'Costas',                          1),
  ('bolsa-flora', 'Corte Lona',  'Lateral 1',                       1),
  ('bolsa-flora', 'Corte Lona',  'Lateral 2',                       1),
  ('bolsa-flora', 'Corte Forro', 'Frente',                          1),
  ('bolsa-flora', 'Corte Forro', 'Costas',                          1),
  ('bolsa-flora', 'Corte Forro', 'Lateral 1',                       1),
  ('bolsa-flora', 'Corte Forro', 'Lateral 2',                       1),
  ('bolsa-flora', 'Corte Forro', 'Bolso de trás',                   2),
  ('bolsa-flora', 'Corte Forro', 'Bolso de dentro',                 2),
  ('bolsa-flora', 'Corte Forro', 'Bolso canguru',                   1),
  ('bolsa-flora', 'Corte Couro', 'Corte alça Flora A',              4),
  ('bolsa-flora', 'Corte Couro', 'Corte alça Flora B',              4),
  ('bolsa-flora', 'Corte Couro', 'Casinha',                         2),
  ('bolsa-flora', 'Corte Couro', 'Tirinha do fecho de dentro 5 cm', 2),
  ('bolsa-flora', 'Corte Couro', 'Boca de palhaço',                 1),
  ('bolsa-flora', 'Corte Couro', 'Alça',                            2),
  ('bolsa-flora', 'Aplicações',  'Flora A',                         3),
  ('bolsa-flora', 'Aplicações',  'Flora B',                         1),
  ('bolsa-flora', 'Aplicações',  'Flora C',                         1),
  ('bolsa-flora', 'Aplicações',  'Flora D',                         1),
  ('bolsa-flora', 'Aplicações',  'Flora E',                         1),
  ('bolsa-flora', 'Metais',      'Argola G',                        4),
  ('bolsa-flora', 'Metais',      'Rebite',                          8),
  ('bolsa-flora', 'Metais',      'Ímã',                             1),
  ('bolsa-flora', 'Metais',      'Cursor diamante',                 1),
  ('bolsa-flora', 'Metais',      'Meia argola 1,5 cm',              1),
  ('bolsa-flora', 'Metais',      'Mosquetão P',                     1),
  ('bolsa-flora', 'Aviamentos',  'Fecho padrão 18 cm',              1),
  ('bolsa-flora', 'Aviamentos',  'Fecho metro 20 cm',               1),
  ('bolsa-flora', 'Aviamentos',  'Etiqueta bordada',                1),
  ('bolsa-flora', 'Aviamentos',  'Etiqueta de composição',          1),

  -- ══ MANDALA ══
  ('bolsa-mandala', 'Corte Lona',  'Frente',                        1),
  ('bolsa-mandala', 'Corte Lona',  'Costas',                        1),
  ('bolsa-mandala', 'Corte Lona',  'Lateral',                       2),
  ('bolsa-mandala', 'Corte Lona',  'Tira da boca',                  2),
  ('bolsa-mandala', 'Corte Lona',  'Viés da boca',                  2),
  ('bolsa-mandala', 'Corte Forro', 'Frente e costas (peça única)',  1),
  ('bolsa-mandala', 'Corte Forro', 'Lateral',                       2),
  ('bolsa-mandala', 'Corte Forro', 'Bolso canguru',                 1),
  ('bolsa-mandala', 'Corte Forro', 'Bolso de trás',                 1),
  ('bolsa-mandala', 'Corte Forro', 'Bolso de dentro',               2),
  ('bolsa-mandala', 'Corte Couro', 'Alça',                          2),
  ('bolsa-mandala', 'Corte Couro', 'Acabamento de alça',            4),
  ('bolsa-mandala', 'Corte Couro', 'Casinha',                       2),
  ('bolsa-mandala', 'Corte Couro', 'Couro boca zíper',              2),
  ('bolsa-mandala', 'Corte Couro', 'Boca de palhaço',               1),
  ('bolsa-mandala', 'Aplicações',  'Mandala A',                     1),
  ('bolsa-mandala', 'Aplicações',  'Mandala B',                     3),
  ('bolsa-mandala', 'Aplicações',  'Mandala C',                     4),
  ('bolsa-mandala', 'Aplicações',  'Mandala D',                     4),
  ('bolsa-mandala', 'Aplicações',  'Mandala E',                     4),
  ('bolsa-mandala', 'Aplicações',  'Mandala F',                     2),
  ('bolsa-mandala', 'Aplicações',  'Mandala G',                     2),
  ('bolsa-mandala', 'Aplicações',  'Mandala H',                     2),
  ('bolsa-mandala', 'Metais',      'Cursor diamante',               2),
  ('bolsa-mandala', 'Aviamentos',  'Fecho metro 40 cm',             1),
  ('bolsa-mandala', 'Aviamentos',  'Fecho metro 20 cm',             1),
  ('bolsa-mandala', 'Aviamentos',  'Fecho padrão 18 cm',            1),
  ('bolsa-mandala', 'Aviamentos',  'Etiqueta bordada',              1),
  ('bolsa-mandala', 'Aviamentos',  'Etiqueta de composição',        1)
)
INSERT INTO public.bill_of_materials
  (product_id, raw_material_id, material_category, material_type, quantity_needed)
SELECT
  p.id,
  CASE WHEN r.categoria LIKE 'Corte %' THEN NULL      ELSE rm.id       END,
  CASE WHEN r.categoria LIKE 'Corte %' THEN r.categoria ELSE NULL      END,
  CASE WHEN r.categoria LIKE 'Corte %' THEN r.tipo      ELSE NULL      END,
  r.qtd
FROM receita r
JOIN public.products p ON p.slug = r.slug
LEFT JOIN public.raw_materials rm
  ON rm.category = r.categoria AND rm.type_specific = r.tipo AND rm.color IS NULL
WHERE r.categoria LIKE 'Corte %' OR rm.id IS NOT NULL;

-- Aviamentos vendidos por metro: ficam fora da lista acima porque a quantidade
-- é fracionária (a lista literal é de inteiros).
INSERT INTO public.bill_of_materials (product_id, raw_material_id, quantity_needed)
SELECT p.id, rm.id, v.qtd
FROM (VALUES
  ('bolsa-lyra',    'Viés 2,5 cm', 2.5),
  ('bolsa-lyra',    'Viés 3 cm',   2.5),
  ('bolsa-flora',   'Viés 2,5 cm', 2.0),
  ('bolsa-flora',   'Gorgurão',    1.2),
  ('bolsa-mandala', 'Viés 2,5 cm', 1.8)
) AS v(slug, tipo, qtd)
JOIN public.products p ON p.slug = v.slug
JOIN public.raw_materials rm
  ON rm.category = 'Aviamentos' AND rm.type_specific = v.tipo AND rm.color IS NULL
ON CONFLICT DO NOTHING;
