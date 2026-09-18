# Plano — Correios Fases 1 e 2

Spec: `docs/superpowers/specs/2026-09-18-correios-fases-1-2-implementacao.md`
Desenho: `docs/superpowers/specs/2026-09-18-integracao-correios-design.md`

Cada passo termina com `npx tsc --noEmit` limpo. O build roda nos passos 5 e 10.

---

## Fase 1 — camada neutra

### Passo 1 — Migration 048 pelo MCP

- `orders`: `shipping_carrier`, `shipping_service_code`, `shipment_id`
- `store_settings`: `carrier_sender_name`, `carrier_sender_cnpj`
- Backfill dos pedidos que já têm vínculo com o ME
- Arquivo em `supabase/migrations/048_shipping_carrier_neutro.sql` **e**
  aplicada pelo MCP na mesma hora
- Confere: `SELECT` nas colunas novas + contagem do backfill

### Passo 2 — `lib/shipping/` puro (sem rede)

`types.ts`, `carrier.ts`, `option-id.ts`, `package.ts`.
Nada importa Supabase nem faz fetch. Só tipos e função pura.

### Passo 3 — id composto atravessa o sistema

`ShippingOption.id` vira `string`. Ripple:
`lib/types.ts` → `lib/actions/shipping.ts` → `lib/actions/payments.ts` →
`lib/server/orders.ts` → `app/(store)/checkout/page.tsx`.

O pedido passa a gravar `shipping_carrier` e `shipping_service_code` junto com
as colunas antigas do ME.

### Passo 4 — Melhor Envio implementa a interface

`lib/shipping/melhor-envio/index.ts` embrulha
`lib/integrations/melhor-envio.ts`. `registry.ts` devolve só o ME.
`getShippingOptions` passa a ir pelo registry.

**Nada muda para o usuário.** Mesmo preço, mesmas opções, mesma ordem.

### Passo 5 — porteira da Fase 1

`npx tsc --noEmit` + `npx next build` até "Compiled successfully".
Commit da Fase 1.

---

## Fase 2 — cotação pelos Correios

### Passo 6 — `correios/services.ts` + `token.ts` + `client.ts`

Catálogo dos três serviços. Cache de token por escopo, com renovação a 5 min
do fim e uma requisição em voo por escopo. Cliente com bearer e tradução de
erro. `CORREIOS_CODIGO_ACESSO` só dentro do header.

### Passo 7 — `correios/quote.ts` + `correios/index.ts`

Lote de preço e lote de prazo em paralelo, casados por `nuRequisicao`.
Trata 206 e `txErro` por item. `ERP-008` do Mini Envios sai da lista sem virar
erro. Registro do adaptador no registry.

### Passo 8 — ligar ao carrinho

`getShippingOptions` consulta as duas transportadoras com
`Promise.allSettled`, aplica a regra de precedência (Correios direto expulsa
Correios do ME) e segue com o filtro de `enabled_carriers` que já existe.
Correios falhando degrada para o ME.

### Passo 9 — as bordas

- `purchaseShippingLabel` recusa pedido `shipping_carrier = 'correios'` com a
  mensagem que diz o que fazer (spec 4.6)
- "Correios (Mini Envios)" entra em `ALL_CARRIERS` da tela de envio
- `/admin/diagnostico` ganha o bloco Correios: variáveis e teste de conexão

### Passo 10 — verificação contra produção

Script no scratchpad, compilando os módulos de verdade de `lib/shipping/`:

1. Cota 36880-078 → CEP real, pacote real
2. Imprime PAC / SEDEX / Mini com preço e prazo
3. Cota o mesmo trecho no Melhor Envio
4. **Afirma: preço de contrato < preço do ME** (critério nº 1)
5. Exercita `parseOptionId` e `consolidatePackage`

Depois: `npx tsc --noEmit` + `npx next build`. Commit da Fase 2.

---

## Barreiras

- Nenhum `POST /prepostagem`, nenhum `DELETE`, nenhuma escrita nos Correios
- `CORREIOS_CODIGO_ACESSO` nunca impresso, logado ou gravado
- Nenhuma dependência instalada
- Migrations pelo MCP, não entregues como `.sql` para rodar à mão
- Commits direto na `main`
