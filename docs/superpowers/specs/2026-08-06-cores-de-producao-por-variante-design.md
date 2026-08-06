# Cores de produção por variante — design

Data: 2026-08-06
Branch: `claude/product-variants-color-recipe-5981a7`

## Problema

A receita já é do produto e é herdada por todas as variantes (migrations 028–031). O
modelo de dados está correto. O que não funciona é a ponta em que a cor entra:

1. **Cor é opcional.** Uma variante salva com `color_lona`, `color_forro` e
   `color_couro` vazios. A receita dela fica pela metade e nada avisa.
2. **A receita não aparece dentro da variante.** Abrindo o card no modal do produto
   aparecem só três caixas de cor soltas — sem a receita herdada, sem indicar quais
   linhas dependem de cor, sem mostrar o estoque daquele corte naquela cor.
3. **Cor é texto livre** com um `datalist` que mistura as cores de todos os materiais.
   Um espaço a mais ou uma minúscula quebra o casamento com `raw_materials.color` em
   silêncio.
4. **A paleta não é por material.** Cor de couro, de lona e de forro moram no mesmo balaio.
5. **Não existe "adicionar nova cor"** como ação.
6. **Falta a categoria Corte Tecido.** Só existem Lona, Forro e Couro.

### Estado do banco em 2026-08-06

Levantado direto no Supabase do e-commerce antes do desenho:

| Métrica | Valor |
| --- | --- |
| Produtos / variantes | 36 / 97 |
| Itens de receita | 143 — sendo 70 de corte, em 5 produtos / 23 variantes |
| Insumos de corte cadastrados | 0 (só Aplicações 27, Aviamentos 11, Metais 8) |
| Variantes com cor de produção | 0 |
| Cores distintas no banco | 0 |
| Ordens de produção | 6 |

Consequência: hoje nenhuma OP desses 5 produtos consegue concluir — as 70 linhas de
corte voltam de `resolve_variant_bom` com `resolved = false`. A paleta nasce vazia,
não há de onde herdar cor.

## Decisões

| # | Decisão | Alternativas descartadas |
| --- | --- | --- |
| 1 | Corte Tecido vira a 4ª categoria de corte | Manter 3; deixar só preparado |
| 2 | Cores da variante em tabela `variant_cut_colors` | 4ª coluna `color_tecido`; JSONB |
| 3 | Paleta em tabela `material_colors`, escopada por categoria | Derivar de `raw_materials` |
| 4 | Cor obrigatória bloqueia salvar a variante | Salvar com pendência; bloquear publicação também |
| 5 | Card da variante mostra a receita inteira com cor e estoque | Só as linhas que pedem cor; receita editável por variante |
| 6 | Legado migra para a cor placeholder "Indefinida" | Deixar nulo; apagar |
| 7 | Matérias-primas mantém 3 abas; coluna Cor em cada uma | Aba nova de Cores |
| 8 | Aba Receitas ganha seletor de variante no topo | Listar todas as cores; uma linha por cor |
| 9 | Paleta nasce só com "Indefinida" | Semear cores genéricas |
| 10 | Migrations aplicadas direto no Supabase via MCP | Entregar `.sql` para rodar à mão |

## Modelo de dados

### `cut_categories` (nova)

Fonte de verdade de quais categorias exigem cor. Substitui o `CHECK` fixo da
migration 029 por uma FK. Categoria nova daqui pra frente é um `INSERT`, sem migration.

```sql
cut_categories (
  category    text PRIMARY KEY,   -- 'Corte Lona' | 'Corte Forro' | 'Corte Couro' | 'Corte Tecido'
  label       text NOT NULL,      -- rótulo curto na UI: 'Lona', 'Forro', 'Couro', 'Tecido'
  sort_order  integer NOT NULL,
  is_active   boolean NOT NULL DEFAULT true
)
```

### `material_colors` (nova)

A paleta, escopada por categoria — couro tem a paleta dele, lona a dela.

```sql
material_colors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category       text NOT NULL REFERENCES cut_categories(category) ON UPDATE CASCADE,
  name           text NOT NULL,
  hex            text,                              -- opcional, bolinha no dropdown
  is_placeholder boolean NOT NULL DEFAULT false,    -- só a "Indefinida"
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (category, name)
)
```

Seed: uma linha `Indefinida` com `is_placeholder = true` por categoria. Nada mais —
as cores reais o Henrique cadastra pelo botão `+ Nova cor`.

### `variant_cut_colors` (nova) — substitui as 3 colunas

```sql
variant_cut_colors (
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  category   text NOT NULL,
  color      text NOT NULL,
  PRIMARY KEY (variant_id, category),
  FOREIGN KEY (category, color)
    REFERENCES material_colors(category, name) ON UPDATE CASCADE
)
```

A FK composta garante que **não existe cor de variante fora da paleta** — é o que
elimina o erro silencioso de digitação de hoje. Guarda o nome e não o id porque
`raw_materials.color` também é texto: o casamento continua direto, e o
`ON UPDATE CASCADE` cobre renomeação futura.

`material_colors` precisa de `UNIQUE (category, name)` para ser alvo dessa FK — já está.

### Funções SQL

`resolve_variant_bom` e `pending_cut_materials` perdem o `CASE` escrito à mão sobre as
três colunas e passam a fazer `JOIN variant_cut_colors vc ON vc.variant_id = ... AND
vc.category = b.material_category`. `complete_production_order` e
`revert_production_order` (migration 030) **não mudam** — consomem `resolve_variant_bom`.

`bill_of_materials.material_category` troca o `CHECK` de 3 valores por FK para
`cut_categories`.

## Migração dos dados

Ordem, numa única migration:

1. Cria `cut_categories` e insere as 4 linhas.
2. Cria `material_colors` e insere `Indefinida` (placeholder) por categoria.
3. Cria `variant_cut_colors`.
4. Backfill: para cada variante, para cada categoria **que a receita do produto dela
   realmente usa**, insere uma linha com `Indefinida`. São 23 variantes × 3 categorias
   = 69 linhas. As outras 74 variantes pertencem a produtos sem corte na receita e não
   recebem linha nenhuma.
5. Troca o `CHECK` de `bill_of_materials.material_category` por FK.
6. Recria `resolve_variant_bom` e `pending_cut_materials`.
7. Só então dropa `color_lona`, `color_forro`, `color_couro`.

Nenhuma variante existente quebra. Toda pendência fica visível como "Indefinida".

Aplicada direto no Supabase via `mcp__supabase__apply_migration`; o arquivo fica
versionado em `supabase/migrations/035_*.sql` como histórico.

Verificação pós-migration (contagem por estado: com cor real / indefinida / faltando)
roda como `execute_sql` logo depois e vai no relatório final.

## Regras de obrigatoriedade

**Categorias exigidas de um produto** = as categorias de corte distintas que aparecem
na receita dele. Um produto só de couro não pede cor de lona.

| Momento | Comportamento |
| --- | --- |
| Salvar variante | Bloqueia se falta cor de alguma categoria exigida. Erro no card, nomeando a categoria: "Defina a cor do forro." |
| Variante já em "Indefinida" | **Conta como preenchida** para efeito de salvar — senão as 69 linhas do backfill travariam qualquer edição de produto legado. O que ela bloqueia é a produção. |
| Escolher "Indefinida" | Não é oferecida no dropdown. Só aparece se a variante já estiver nela (dado legado). Variante nova não nasce indefinida. |
| Adicionar corte à receita pela aba Receitas | **Não bloqueia.** As variantes daquele produto que ainda não declaram a categoria nova ficam pendentes, e a aba mostra o aviso com link. Bloquear ali impediria montar a receita antes de existir cor cadastrada. |
| Importar produtos por CSV | Cria as linhas em "Indefinida" — o CSV não tem como saber as cores. Mesmo tratamento do legado. |
| Concluir OP | Bloqueia se alguma cor for placeholder, com mensagem própria — não o genérico de "insumo não cadastrado". |
| `pending_cut_materials` | Ignora placeholder. Não faz sentido criar "Corte Lona › Frente › Indefinida" no estoque. |
| Publicar na loja | Não bloqueia. Decisão explícita. |

## UI — modal do produto

**A seção Receita sobe para antes das Variantes.** Hoje está depois; a receita padrão
precisa existir antes de a variante herdá-la.

Card da variante expandido ganha o bloco "Receita desta variante", agrupado pelas
seções da ficha técnica:

```
▾ Mostarda — Único                                    BOL-FLOR-MOS-UNI
  [ cor · tamanho · SKU · estoque ]
  [ fotos ]
  ─────────────────────────────────────────────────────────────
  Receita desta variante · herdada do produto (34 itens)

  ▸ Corte Lona        Cor: [ Mostarda        ▾ ]      12 peças
      Frente              1 un    ✓ 8 em estoque
      Casinha             2 un    ✗ 1 em estoque (precisa 2)
      Fundo               1 un    ⚠ não cadastrado nesta cor
  ▸ Corte Forro       Cor: [ Cru             ▾ ]       9 peças
  ▸ Corte Couro       Cor: [ ⚠ Indefinida    ▾ ]       6 peças
  ▸ Aviamentos        cor fixa                         7 itens
      Zíper nº5 Dourado   1 un    ✓ 40 em estoque
```

- **Um dropdown por categoria**, não por linha: a variante tem uma cor de lona que vale
  para as 12 peças de lona. É como o modelo funciona e como o Henrique pensa.
- Estoque por peça, na cor escolhida: verde suficiente, vermelho insuficiente, âmbar
  não cadastrado. Trocar a cor recalcula na hora.
- Linhas de cor fixa (Aplicações, Metais, Aviamentos) em cinza, só leitura, com estoque.
- Resolução feita **no cliente** com os `rawMaterials` que o modal já carrega: casa
  `(category, type_specific, color)` localmente. Sem round-trip, e funciona em produto
  ainda não salvo.
- Receita do produto vazia: "Cadastre a receita acima; ela vale para todas as variantes."

### Dropdown de cor e `+ Nova cor`

`<select>` com as cores ativas da categoria e, no fim, `+ Nova cor…`. Escolher abre um
campo inline no próprio card (input + salvar), chama a server action
`createMaterialColor(category, name)` e já seleciona a cor criada. Não fecha o modal
nem perde o que estava preenchido.

## UI — Matérias-Primas

Mantém as 3 abas atuais: **Insumos · Receitas · Compras**. Sem aba de Cores.

| Aba | Mudança |
| --- | --- |
| Insumos | Nova coluna **Cor** na tabela (`raw_materials.color`). No formulário "Nova matéria-prima", o campo Cor vira o mesmo dropdown da paleta com `+ Nova cor`, filtrado pela categoria escolhida. |
| Receitas | Seletor **"ver como: [variante ▾]"** no topo da receita do produto. Sem variante escolhida, as linhas de corte mostram "cor da variante" e a coluna Estoque fica vazia. Com variante escolhida, Cor e Estoque ficam concretas. Novo aviso quando a receita usa uma categoria que alguma variante ainda não declara: "3 variantes sem cor de Tecido", com link que abre o produto no modal. |
| Compras | Nova coluna **Cor**, vinda do `raw_material` referenciado. |

A definição da cor continua sendo **na variante**. A receita padrão só adianta o
trabalho — é o que a aba Receitas comunica.

## Fora de escopo

- **Renomear e desativar cor.** Sem tela de paleta, a v1 só adiciona. Renomear é onde
  mora o risco de desalinhar `material_colors.name` de `raw_materials.color`; fica para
  a v2, junto com a tela.
- **Bloquear publicação na loja** por variante indefinida.
- **Variante sobrescrever** quantidade ou linha da receita padrão.
- `product_variants.color` (a cor comercial que aparece na loja) continua separada das
  cores de produção e não muda.

## Testes

Não existe `cypress/` no repositório. A validação possível neste ambiente é
`typecheck` + `build`, e o sandbox não tem env do Supabase — rotas com DB não sobem aqui.

As migrations são aplicadas e verificadas direto no Supabase via MCP, com query de
conferência pós-migration. O fluxo de UI (salvar variante sem cor, criar cor nova,
concluir OP com cor indefinida) precisa de uma passada manual no painel — fica anotado
como pendência de aceite, não como algo que eu consiga afirmar daqui.

Cobertura ausente a sinalizar: nenhum teste automatizado cobre `resolve_variant_bom`
nem `complete_production_order` hoje, e ambos mudam de forma neste trabalho.
