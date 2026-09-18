# Correios — Fases 1 e 2: spec de implementação

> Deriva de `2026-09-18-integracao-correios-design.md`. Aquele documento é o
> desenho; este é o que vai ser escrito, arquivo por arquivo, e como cada coisa
> é verificada.
>
> Escopo: **Fase 1** (camada neutra + migration) e **Fase 2** (cotação pelos
> Correios no carrinho). **A Fase 3 não entra** — nenhuma chamada que escreve
> nos Correios. `POST /prepostagem` não é implementado nem chamado.

---

## 1. Fatos novos, medidos em 18/09/2026

Confirmados contra a API de produção durante o levantamento desta spec, em cima
do que a spec de design já tinha verificado.

| Achado | Consequência no código |
| --- | --- |
| O token de contrato devolve `contrato.dr = 8` | `nuDR` sai do token. **Não** vira variável de ambiente nova |
| `POST /preco/v1/nacional` responde **HTTP 206** quando parte do lote falha | `res.ok` é `true` em 206. O erro é **por item**, em `txErro` — quem olhar só o status não vê a recusa |
| Preço volta como string pt-BR: `"25,94"` | Converter com troca de vírgula, como o código do ME já faz |
| `/prazo` devolve `prazoEntrega` — **um inteiro**, não faixa | `delivery_days_min === delivery_days_max`. Não há faixa a inventar |
| Mini Envios (04227) recusa acima de ~24×16×4 cm / 300 g com `ERP-008` | Recusa **esperada**, não falha. Cai fora da lista em silêncio, como o ME já faz |
| O token de contrato **não** traz `cartaoPostagem` | Escopo de cartão só será necessário na Fase 3. O cache já nasce por escopo |

### Critério de sucesso nº 1 — medido

Trecho 36880-078 (Muriaé/MG, origem real) → 01310-100 (São Paulo/SP),
pacote 30×25×12 cm, 800 g:

| Serviço | Correios (contrato) | Melhor Envio | Diferença |
| --- | --- | --- | --- |
| PAC | **R$ 25,94** | R$ 31,13 | −16,7 % |
| SEDEX | **R$ 48,15** | R$ 57,78 | −16,7 % |

O preço de contrato sai menor. O critério está satisfeito antes de uma linha
ser escrita — o que resta é o código chegar ao mesmo número.

---

## 2. Decisões que esta spec toma

O desenho deixou três coisas em aberto. Ficam decididas aqui.

### 2.1 Uma grafia só para o nome da transportadora: `melhor-envio`

O desenho escreve `'correios' | 'melhor_envio'` no banco (underscore) e
`melhor-envio/` na pasta (hífen). Duas grafias da mesma coisa é um bug
esperando o dia em que alguém compare as duas.

Vale **hífen em todo lugar** — banco, TypeScript e o prefixo do id composto.
É o mesmo texto que atravessa o navegador dentro de `"melhor-envio:1"`, e o
id é a peça que mais viaja.

### 2.2 O pacote é consolidado em uma caixa, não cotado peça a peça

Os Correios precificam **um objeto**. O carrinho tem N itens.

Somar N cotações produziria um preço que a Fase 3 não consegue honrar: a
pré-postagem cria **uma** pré-postagem, com **um** `pesoInformado` e **um**
conjunto de dimensões. Cotar N objetos e despachar 1 é a mesma família de erro
que o CEP de cotação diferente do CEP de coleta — o cliente paga um frete e a
loja paga outro, e nada acusa.

Regra: peso somado, comprimento e largura pelo maior item, altura empilhada.
Depois disso, elevar aos mínimos que os Correios aceitam para pacote.

### 2.3 Enquanto os dois convivem, os Correios diretos vencem os Correios do ME

A Fase 2 liga a cotação direta sem desligar o Melhor Envio (isso é a Fase 5).
Sem regra, o carrinho mostraria "Correios PAC" duas vezes, com preços
diferentes, e o cliente escolheria o errado metade das vezes.

Regra: **quando o adaptador dos Correios responde com pelo menos uma opção, as
opções do Melhor Envio cuja empresa é "Correios" saem da lista.** Jadlog e o
resto do ME continuam. É a diferença entre ter duas fontes e ter duas verdades.

### 2.4 A cotação dos Correios degrada, não derruba o carrinho

Mesma regra que `getShippingOrigin()` já segue: dado fiscal falha fechado,
frete degrada. Se o token dos Correios não responde, o carrinho continua
cotando pelo Melhor Envio e o motivo vai para o log e para
`/admin/diagnostico`. Parar de vender é pior.

---

## 3. Arquivos

### 3.1 Novos

```
lib/shipping/
  types.ts            CarrierId · ShippingPackageItem · CarrierQuote · QuoteRequest
  carrier.ts          interface ShippingCarrier
  package.ts          consolidatePackage() — a caixa única (2.2). Puro.
  option-id.ts        formatOptionId / parseOptionId — "carrier:codigo". Puro.
  registry.ts         quais transportadoras estão ativas e em que ordem
  correios/
    services.ts       03298 PAC · 03220 SEDEX · 04227 Mini Envios
    token.ts          cache por escopo, 24 h, uma requisição em voo por escopo
    client.ts         fetch autenticado + tradução de erro
    quote.ts          POST /preco/v1/nacional + /prazo/v1/nacional em lote
    index.ts          o ShippingCarrier dos Correios
  melhor-envio/
    index.ts          o ShippingCarrier do ME, em cima de lib/integrations/melhor-envio.ts
```

`lib/integrations/melhor-envio.ts` **fica onde está**. Mover 290 linhas junto
com uma mudança de tipo mistura duas coisas num diff só. O adaptador embrulha;
a Fase 5 move.

`lib/server/label.ts` **não é reescrito nesta fase**. Ele é o caminho da
etiqueta, que é Fase 3. Só passa a ler as colunas novas.

### 3.2 Tocados

| Arquivo | O que muda |
| --- | --- |
| `lib/types.ts` | `ShippingOption.id: number → string`; comentário deixa de dizer "Melhor Envio" |
| `lib/actions/shipping.ts` | Passa a consultar o registry em vez de chamar o ME direto; dedupe de 2.3 |
| `lib/actions/payments.ts` | `shipping.serviceId: number → optionId: string`; grava as colunas novas |
| `lib/server/orders.ts` | `saveOrder` recebe `shippingCarrier` / `shippingServiceCode` |
| `lib/server/label.ts` | Lê `shipping_carrier`; pedido dos Correios não tenta comprar etiqueta no ME |
| `app/(store)/checkout/page.tsx` | Envia `optionId` |
| `components/admin/config/section-envio.tsx` | "Correios (Mini Envios)" entra na lista de habilitáveis |
| `lib/server/diagnostics.ts` + `/admin/diagnostico` | Bloco Correios: variáveis e teste de conexão |

### 3.3 Migration `048_shipping_carrier_neutro.sql`

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_carrier      text,
  ADD COLUMN IF NOT EXISTS shipping_service_code text,
  ADD COLUMN IF NOT EXISTS shipment_id           text;

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS carrier_sender_name text,
  ADD COLUMN IF NOT EXISTS carrier_sender_cnpj text;

-- Backfill: pedido que já tem vínculo com o ME passa a dizer isso nas colunas novas.
UPDATE orders SET
  shipping_carrier      = 'melhor-envio',
  shipping_service_code = melhor_envio_service_id::text,
  shipment_id           = melhor_envio_order_id
WHERE melhor_envio_service_id IS NOT NULL
   OR melhor_envio_order_id  IS NOT NULL;
```

As colunas antigas **não saem**. Continuam sendo escritas para pedido do ME —
o painel liga botões por `melhor_envio_order_id`, e um pedido histórico não
pode perder o botão de imprimir etiqueta.

`carrier_sender_name` / `carrier_sender_cnpj` entram agora, vazias, porque a
migration é uma só. Quem as lê é a Fase 3.

Sem CHECK em `shipping_carrier`: a Fase 5 vai mexer no conjunto de valores, e
um CHECK aqui só cobraria uma migration a mais lá na frente.

São colunas novas em tabela existente — não precisam de GRANT.

---

## 4. Como cada peça funciona

### 4.1 `option-id.ts`

```
formatOptionId('correios', '03298')  →  'correios:03298'
parseOptionId('correios:03298')      →  { carrier: 'correios', serviceCode: '03298' }
parseOptionId('lixo')                →  null
```

O código do serviço pode conter qualquer coisa menos `:`. O split é no
**primeiro** `:` — o resto é o código inteiro.

### 4.2 `token.ts`

Um `Map<Escopo, Entrada>` no módulo. Entrada guarda token, instante de
expiração e `contrato.dr`.

- Renova quando falta menos de 5 minutos para expirar.
- **Uma requisição em voo por escopo.** Dez carrinhos simultâneos com o cache
  frio fazem uma chamada, não dez. É o que atende o limite de 3 req/s do
  desenho sem inventar um rate limiter.
- O `codigoDeAcesso` é lido por `readEnv()` e só existe dentro do
  `Authorization`. Não entra em mensagem de erro, log ou retorno.

### 4.3 `quote.ts`

Duas chamadas em paralelo, uma de preço e uma de prazo, cada uma com o lote dos
três serviços. `nuRequisicao` é o índice, e é por ele que preço e prazo se
casam de volta.

Um serviço só vira opção quando **preço e prazo** vieram sem `txErro`. Preço
sem prazo é opção que o cliente não sabe quando recebe.

`nuContrato` + `nuDR` vão no preço — é o que faz sair o preço de contrato em
vez do balcão. Sem eles, o número seria o de tabela cheia.

### 4.4 `registry.ts`

```
getShippingCarriers() → ShippingCarrier[]
```

Devolve os Correios quando `CORREIOS_USUARIO`, `CORREIOS_CODIGO_ACESSO` e
`CORREIOS_CONTRATO` estão preenchidos, e o Melhor Envio quando
`MELHOR_ENVIO_TOKEN` está. Um ambiente sem credencial nenhuma devolve lista
vazia e o carrinho diz que não conseguiu cotar — que é a verdade.

### 4.5 `getShippingOptions()` depois da mudança

1. Resolve origem (`getShippingOrigin()`) e as medidas dos itens — **sem
   mudança**.
2. `consolidatePackage()` transforma os itens numa caixa.
3. Pergunta a cada transportadora do registry, em paralelo, com
   `Promise.allSettled` — uma que falha não leva a outra junto.
4. Aplica 2.3: Correios direto expulsa Correios do ME.
5. Aplica `matchesEnabledCarrier` — **o mesmo filtro de hoje**, sem mudança,
   porque o adaptador dos Correios emite `company: 'Correios'` e
   `name: 'PAC' | 'SEDEX' | 'Mini Envios'`, o mesmo vocabulário que já está
   salvo em `enabled_carriers`.
6. Soma `shipping_extra_days`, ordena por preço.

### 4.6 O pedido que escolhe Correios na Fase 2

A Fase 3 não existe. Um pedido pago que escolheu Correios **não tem como gerar
etiqueta**, e isso precisa aparecer.

`purchaseShippingLabel()` passa a olhar `shipping_carrier`. Sendo `'correios'`,
grava em `shipping_error` a frase que diz o que fazer:

> Frete pelos Correios: a pré-postagem automática ainda não está ligada
> (Fase 3). Poste na agência e cole o código de rastreio no pedido.

Pedido pago sem etiqueta e sem explicação é mercadoria que não sai. Com a
frase, o Henrique sabe que é para postar na mão.

---

## 5. Verificação

Este sandbox não tem env do Supabase — `dev` e `build` travam em rota que toca
o banco. O que dá para fazer é isto, e é o que será feito:

| O quê | Como |
| --- | --- |
| Tipos | `npx tsc --noEmit` |
| Build | `npx next build` até "Compiled successfully" |
| Migration | Aplicada pelo MCP do Supabase, e conferida por `SELECT` nas colunas |
| Cotação real | Script em `scratchpad`, compilando os módulos de verdade de `lib/shipping/`, contra a API de **produção** — leitura pura |
| Preço de contrato < ME | O mesmo script cota os dois para o mesmo trecho e imprime a diferença |
| Consolidação e id | Funções puras, exercitadas no mesmo script |

Não há runner de teste unitário no projeto (só Playwright e2e), e instalar um
está fora do escopo desta tarefa. As funções puras nascem puras justamente para
que o teste, quando houver runner, seja de uma linha. Fica anotado como
pendência.

---

## 6. O que fica de fora, de propósito

- `POST /prepostagem` — Fase 3, exige autorização do Henrique
- `sanitize.ts` (limites de campo da seção 2.5 do desenho) — só serve à
  pré-postagem
- Rastreio por cron — Fase 4
- Desligar o Melhor Envio — Fase 5
- `lib/integrations/melhor-envio.ts` continua no lugar
- `carrier_sender_*` são criadas mas ninguém lê nem edita ainda
