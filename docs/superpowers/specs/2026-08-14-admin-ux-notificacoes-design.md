## Painel admin — cancelamento, cliente, notificações, senha, config e banner

Data: 14/08/2026 · Branch: `claude/handoff-ux-ui-updates-43dd10`

Sete frentes aprovadas na conversa de 14/08. Cada uma é independente das outras;
a ordem de execução abaixo existe só para que as migrations venham antes das telas
que dependem delas.

---

## 1. Motivos de cancelamento

**Migration 041.** Duas colunas em `orders`:

```sql
cancellation_reason text     -- slug fechado, ver lista abaixo
cancellation_notes  text     -- observação livre, opcional
```

Motivos: `duplicado` · `desistencia` · `sem_estoque` · `endereco_incorreto` ·
`fraude` · `outro`. Guardar o slug, não o rótulo — o rótulo muda, o dado consultável não.

`updateOrderStatus(orderId, status, cancellation?)` ganha o terceiro argumento.
Quando `status === 'cancelled'`, o motivo é **obrigatório e revalidado no servidor**:
a action recusa um slug fora da lista. O estorno de estoque que já existe continua
antes da gravação, sem alteração.

**UI.** No varejo, o passo de confirmação que já vive no painel expandido ganha o
select e o campo de observação. No atacado, "Cancelar pedido" do dropdown deixa de
cancelar direto e passa a abrir o mesmo modal de confirmação — o dropdown é apertado
demais para um formulário. Pedido já cancelado exibe o motivo no painel expandido.

---

## 2. Cliente: pedidos detalhados e ranking de produtos

`getCustomers` já varre todos os pedidos para montar a lista; carregar os itens de
todos os clientes no load da tela sairia caro sem necessidade. Então o detalhe é
**lazy**: nova action `getCustomerPurchaseDetail(customerId)`, chamada quando o
drawer abre, com estado de carregando.

No drawer:

- **Últimos pedidos** — cada linha expande e mostra os itens (nome, SKU, quantidade,
  preço unitário).
- **Produtos mais comprados** — seção nova. Ranking por quantidade de peças,
  contando **apenas pedidos pagos**, histórico completo. Mesma regra do "Total
  comprado" que já aparece no topo do drawer, para que os dois números batam.

---

## 3. Padrão único de linha expansível

Hoje cada tela abre de um jeito. O padrão passa a ser um só:

| Tela            | Chevron | Linha clicável | Coluna Ações            |
| --------------- | ------- | -------------- | ----------------------- |
| Estoque         | 1ª col  | sim            | lápis + apagar          |
| Pedidos varejo  | 1ª col  | sim            | **removida**            |
| Pedidos atacado | 1ª col  | sim            | lápis (dropdown)        |

A linha inteira responde a clique e a teclado (`Enter` / `Espaço`, com `role` e
`aria-expanded`). Todo controle dentro da linha — switch, lápis, apagar, link —
usa `stopPropagation`, senão clicar em "editar" também expandiria a linha.

O nome do cliente na linha do pedido vira link para `/admin/clientes?cliente=<id>`,
que abre o drawer daquele cliente direto. Exige expor `customer_id` em
`RetailOrderRow` e `WholesaleOrderRow`, que hoje não carregam esse campo.

---

## 4. Notificações

**Migration 043.** Tabela de estado de leitura — o fato em si continua sendo
derivado dos dados, então nunca desincroniza:

```sql
notification_reads (
  id          uuid primary key,
  kind        text not null,   -- 'account_due' | 'new_order' | 'low_stock' | 'low_material'
  ref_id      text not null,   -- id da conta, do pedido, da variante ou do insumo
  read_at     timestamptz,
  dismissed_at timestamptz,
  created_at  timestamptz default now(),
  unique (kind, ref_id)
)
```

Mais as preferências em `store_settings`: `notif_bill_days_ahead` (default 7) e
`notif_bill_grace_days` (default 1) — a janela do "avisar todo dia até um dia depois
do vencimento".

**Fontes.** Contas a pagar dentro da janela; pedidos novos (varejo e atacado);
estoque e matéria-prima abaixo do mínimo. As duas últimas aproveitam os toggles
`notif_low_stock` e `notif_low_material`, que hoje existem na tela de configurações
e não fazem absolutamente nada.

**UI.** Item **Notificações** na sidebar, acima de Diagnóstico, com badge de
não-lidas. Clicar abre um popover no canto inferior esquerdo com a lista agrupada
por tipo. Clicar numa notificação marca como lida e navega para a tela certa.
Botão "marcar todas como lidas".

---

## 5. Força e visibilidade de senha

`lib/password.ts` concentra a regra: mínimo 8 caracteres com maiúscula, minúscula,
número e caractere especial. Validada no cliente para dar feedback e **revalidada
no servidor** nas actions — validação de cliente é conveniência, não defesa.

Dois componentes novos: um input com revelar-enquanto-segura (mouse, toque e
teclado) e um medidor de força com checklist dos requisitos.

Aplicação: cadastrar, redefinir senha, trocar senha da afiliada e popup de cadastro
recebem regra + medidor. As duas telas de login recebem **só o revelar** — validar
regra no login trancaria clientes que já se cadastraram com senha fraca.

---

## 6. Configurações: rotas por seção e auditoria

Cada seção vira rota própria (`/admin/config/perfil`, `/pagamentos`, `/envio`,
`/fiscal`, `/estoque`, `/integracoes`, `/notificacoes`, `/banner`), acessadas pelo
popover que abre ao clicar em Configurações na sidebar. `/admin/config` redireciona
para o perfil.

**Sai** (é decoração, não salva nada): fuso horário, moeda e idioma; os botões
"Ver configurações" e "Configurar" dos cards de Integrações.

**Entra de verdade:** dados bancários (colunas novas em `store_settings`, migration
043) e o botão "Emitir NF-e de teste", que hoje não faz nada.

**Corrigido:** os badges "Conectado" de Mercado Pago, Melhor Envio e Focus NFe são
literais no código — a tela diz "Conectado" mesmo com token inválido. Passam a ser
derivados de `lib/server/diagnostics.ts`, que já sabe a verdade.

---

## 7. Banner editável

**Migration 042.** Tabela `announcement_messages` (`content`, `sort_order`,
`is_active`), com as sete frases de hoje no seed para que a loja não mude de
comportamento ao migrar.

**Sintaxe.** Markdown-lite: `[palavra](url)` e `**negrito**`. O parser é próprio e
aceita **apenas esses dois padrões**, escapando todo o resto — nada de
`dangerouslySetInnerHTML` com HTML livre, porque o conteúdo vem do banco e um dia
pode vir de alguém que não é o Henrique. Link para `wa.me` ganha o ícone do WhatsApp
automaticamente, preservando o visual atual. Link interno usa `next/link`; externo
sai com `target="_blank"` e `rel="noopener noreferrer"`.

**Admin.** `/admin/config/banner`: lista com ordem, ativar/desativar, editar e
preview renderizado ao lado do campo.

**Leitura.** `createServiceClient({ revalidateSeconds: 60 })`, pela mesma razão do
rodapé: leitura sem cache aqui derruba a geração estática das 52 páginas e leva o
build de volta para 4 minutos.

---

## Validação

`tsc --noEmit` e `next build` limpos a cada frente. Commits separados por frente.
Merge na `main` só no fim, com aviso antes do push — push na `main` dispara deploy
em produção.
