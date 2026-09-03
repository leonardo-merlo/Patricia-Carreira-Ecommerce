-- 047: Infantil como marcação, Almofadas como categoria.
--
-- Infantil NÃO é categoria. Uma bata infantil continua sendo roupa/bata e
-- precisa aparecer nos dois lugares. Como products.category é coluna única,
-- gravar 'infantil' ali tiraria a peça de Vestuário e dos filtros de bata.
-- Por isso vira marcação transversal.
--
-- Almofadas é categoria de verdade: não é roupa, não é bolsa, não é acessório,
-- e não existe nenhuma existente onde caiba.
--
-- Até aqui /infantil e /almofadas eram vitrines mortas: as duas rotas tinham
-- `products = []` fixo no código, e a hero mandava o visitante para /infantil.

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_kids boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_kids IS
  'Peça infantil. Marcação transversal: a peça continua na categoria dela e '
  'também aparece na vitrine /infantil.';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('bolsas', 'roupas', 'acessorios', 'bazar', 'almofadas'));

-- A vitrine infantil filtra por esta coluna a cada visita. Índice parcial
-- porque a esmagadora maioria dos produtos é false.
CREATE INDEX IF NOT EXISTS products_is_kids_idx ON products (is_kids) WHERE is_kids;
