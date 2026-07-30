-- Migration 032: "Viés 1 metro" é vendido por metro, não por unidade
--
-- Na ficha da Nirvana o item aparece como "Viés 1 metro — 1", que o Henrique
-- confirmou ser 1 metro desse viés (e não 1 peça). A quantidade na receita
-- continua 1; só a unidade estava errada.

UPDATE public.raw_materials
   SET unit = 'metro', updated_at = now()
 WHERE category = 'Aviamentos'
   AND type_specific = 'Viés 1 metro';

NOTIFY pgrst, 'reload schema';
