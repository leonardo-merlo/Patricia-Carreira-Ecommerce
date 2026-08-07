# Brief — unificar o design do Admin e do Portal da Afiliada com a loja

Escrito em 2026-08-06, para ser lido no início de uma sessão nova.
Autor do pedido: Leonardo. Cliente final: Henrique (Patrícia Carreira).

## O problema, na palavra dele

> "O admin, a afiliada e o site parecem três sistemas completamente diferentes.
> Foram criados com o Claude, então as cores ficaram muito 'do Claude'."

O objetivo não é redesenhar: é fazer os três parecerem a mesma marca, sem perder
o que já funciona bem no admin.

## Diagnóstico já levantado

### Paletas de hoje

| | Loja | Admin |
| --- | --- | --- |
| Fonte | Be Vietnam (`--font-be-vietnam`) | Inter |
| Cor principal | `#823b18` terracota queimado | `#c97d60` terracota claro (`--accent`) |
| Secundária | `#2559bd` azul cobalto | — |
| Terciária | `#6b4900` dourado envelhecido | — |
| Fundo escuro | — | `#16162a` azul-arroxeado frio (`--sidebar-bg`) |

Arquivos: `tailwind.config.ts` (loja, a partir da linha 38) e
`app/admin/admin.css` (admin, bloco `.admin-root` no topo).

### A conclusão que importa

**O laranja do admin não é o problema.** `#c97d60` já é um terracota da mesma
família de `#823b18` — só mais claro. Mantê-lo é coerente com a marca.

**O problema é a sidebar `#16162a`.** É um azul-marinho frio, sem nenhum
parentesco com a paleta quente da marca. É ele que faz o admin parecer um
produto genérico. Trocar por um marrom escuro / carvão quente derivado do
terracota resolve a maior parte da sensação de "três sistemas diferentes",
com uma mudança pequena.

O Leonardo gosta e quer preservar:
- a tipografia do admin, principalmente a da sidebar ("muito fácil de ler")
- o laranja dos alertas
- o cinza escuro como conceito — o incômodo é a temperatura fria dele, não o escuro

## Pedidos concretos

1. **Logo no topo da sidebar.** Hoje é um ícone genérico ao lado de "Patrícia
   Carreira / Painel Administrativo". Trocar pela logo real da Patrícia Carreira,
   a mesma do site, com fundo claro para destacar contra a barra escura.
2. **Sidebar mais estreita**, e que possa ser recolhida — clicar encolhe / expande.
3. **Configurações vai para o rodapé da sidebar**, logo acima do bloco
   "Henrique Carreira · proprietário".
4. **Aproximar admin e portal da afiliada da identidade da loja** — puxar cores
   e/ou tipografia. O portal da afiliada deve seguir o mesmo padrão do admin.
5. **Encontrar lugar para marrom escuro, bege e verde** da marca dentro do admin.
   O Leonardo não conseguiu definir onde; é uma decisão de design a propor.
   Hipótese dele: alguma área hoje escura poderia virar bege.
6. **Mobile precisa funcionar.** Não é adaptação depois — entra junto.

## Restrições técnicas

- `app/admin/admin.css` é escopado em `.admin-root` de propósito, para não vazar
  para a loja. Manter esse isolamento.
- Regra do projeto: Tailwind v4 com variáveis CSS (`--color-*`), **nunca `@apply`**.
- O admin é operado por **uma pessoa só** (Henrique). UX simples e funcional,
  não corporativa.
- **IDs e `data-testid` estáveis** nos elementos interativos do admin — requisito
  de automação do OpenClaw (CLAUDE.md, seção 9). Não quebrar os que existem ao
  mexer no layout.
- O painel tem e2e em Playwright (`e2e/`). Alguns testes usam seletores de
  estrutura (ex: `.modal .field:has-text("Preço varejo") input`) — mudança de
  layout pode quebrá-los. Rodar `npm run test:e2e` depois.

## Estado do projeto nesta data

- `main` = `08b2a6f`, worktree principal já atualizada e igual ao GitHub/Vercel.
- Migrations 035, 036 e 037 já aplicadas no Supabase de produção (cores de
  produção por peça na variante). Nada disso toca design.
- A branch `claude/mobile-design-adjustments-e4f8fb` está **vazia** — foi criada e
  nunca usada. Pode ignorar ou apagar.

## Como começar a sessão nova

Branch nova a partir da main atualizada. Sugestão de primeira mensagem:

> Leia `docs/design-brief-admin-afiliada.md`. Quero unificar o design do admin e
> do portal da afiliada com a loja, incluindo mobile. Comece pelo diagnóstico
> visual das três interfaces antes de propor qualquer mudança.
