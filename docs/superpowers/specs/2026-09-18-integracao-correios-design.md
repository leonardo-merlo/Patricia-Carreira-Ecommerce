# Integração direta com os Correios — design

> Substituir o Melhor Envio pela API dos Correios, usando o contrato comercial do
> cliente. Escrito em 18/09/2026, depois de diagnóstico executado contra a API de
> produção dos Correios.

## 1. Por que

O Henrique tem contrato comercial com os Correios, com fatura mensal e crédito que
ele não consegue esgotar. Hoje a loja despacha pelo Melhor Envio, que cobra por
etiqueta e **ainda está em sandbox** — nenhuma etiqueta real foi comprada até hoje.

Trocar agora custa menos do que custaria depois: não há histórico de envios reais
para migrar.

## 2. Fatos confirmados (não re-pesquisar)

Tudo abaixo foi verificado contra a API de produção em 18/09/2026, não inferido.

### 2.1 Credenciais

Ficam em `.env.local` e nas env vars da Vercel. **Nunca no código, nunca em log.**

| Variável | Valor | Observação |
| --- | --- | --- |
| `CORREIOS_BASE_URL` | `https://api.correios.com.br` | |
| `CORREIOS_USUARIO` | `20187705000177` | login do Meu Correios = CNPJ do titular |
| `CORREIOS_CODIGO_ACESSO` | *(segredo)* | gerado no CWS; vai no `Authorization: Basic` |
| `CORREIOS_CONTRATO` | `9912687444` | DR 8 (SE/BA), status Ativo |
| `CORREIOS_CNPJ` | `20187705000177` | titular do contrato |
| `CORREIOS_CARTAO_POSTAGEM` | `0079066690` | ativo até 2035-02-12 |

### 2.2 Autenticação

`POST /token/v1/autentica/contrato` com `Authorization: Basic base64(usuario:codigo)`
e corpo `{"numero": "<contrato>"}`. Devolve **HTTP 201** com `{ token, expiraEm }`.

- Token vale **24 horas**.
- A API de token tem **limite de 3 requisições por segundo** (HTTP 429 acima disso).
- A própria documentação manda reaproveitar o token até perto de expirar.
- **Cache de token é requisito, não otimização.** Um pico de carrinhos derruba a
  autenticação sem ele.
- Existem três escopos: `/v1/autentica` (usuário), `/v1/autentica/contrato` e
  `/v1/autentica/cartaopostagem`. O SRO Interatividade exige o escopo de **cartão
  de postagem** — o cache precisa guardar mais de um token.

### 2.3 Serviços habilitados no contrato

Confirmados via `GET /meucontrato/v1/empresas/{cnpj}/contratos/{n}/servicos`:

| Código | Serviço |
| --- | --- |
| `38202` | API PRECOS |
| `38210` | API PRAZOS |
| `86720` | API PRE POSTAGEM |
| `38229` | SRO RASTRO |
| `38237` | SRO INTERATIVIDADE |
| `86738` | API BUSCA CEP |
| `86711` | API BUSCA AGENCIAS |

Serviços de envio, todos na modalidade **CONTRATO AG** (postagem em agência, que é
como o Henrique opera — ele não tem coleta):

| Código | Serviço |
| --- | --- |
| `03298` | PAC CONTRATO AG |
| `03220` | SEDEX CONTRATO AG |
| `04227` | CORREIOS MINI ENVIOS CTR AG |

### 2.4 Contratos OpenAPI

Públicos, sem autenticação, em `https://api.correios.com.br/<api>/v3/api-docs`
para `token`, `preco`, `prazo`, `prepostagem`, `srorastro`, `srointeratividade`.
**Consultar a spec antes de escrever qualquer payload.**

### 2.5 Pré-postagem — `POST /prepostagem/v1/prepostagens`

Obrigatórios: `remetente`, `destinatario`, `codigoServico`, `pesoInformado`,
`codigoFormatoObjetoInformado`, `cienteObjetoNaoProibido`, `itensDeclaracaoConteudo`.

Achados que definem o desenho:

- **Devolve `codigoObjeto` (o rastreio) na criação.** Um passo, não quatro. Não
  existe equivalente ao `checkout → generate → aguardar` do Melhor Envio.
- **`emiteDCe: "S"` faz os Correios emitirem a Declaração de Conteúdo Eletrônica.**
  A loja não monta o documento. A NF-e travada na SEFAZ-MG **não bloqueia o frete**.
- `numeroNotaFiscal` / `chaveNFe` são opcionais quando há declaração de conteúdo.
  Preencher quando a NF-e existir.
- **`ncmObjeto` é opcional.** A pendência de NCM dos produtos não afeta nada aqui.
- `solicitarColeta: "N"` — postagem em agência.
- `modalidadePagamento: "2"` (à faturar) — contrato pós-pago.
- `pedidoExternoOrigem` recebe o id interno do pedido. É o equivalente às `tags`
  do Melhor Envio, e o caminho de volta do objeto para o pedido.
- `codigoServico` precisa constar **no cartão de postagem**, não só no contrato.
- `DELETE /v1/prepostagens/{id}` cancela. É o que torna o teste seguro e repetível.

**Limites de campo — a armadilha.** O Melhor Envio era tolerante; os Correios não:

| Campo | Máximo |
| --- | --- |
| `logradouro` | 50 |
| `bairro` | 30 |
| `cidade` | 30 |
| `complemento` | 30 |
| `numero` | **6** |
| `itensDeclaracaoConteudo[].conteudo` | 60 (mínimo 2) |
| `observacao` | 50 |

Estourar qualquer um devolve HTTP 400 **em cima de um pedido já pago**. Sanitizar
antes de enviar não é polimento, é o que impede a falha.

`EnderecoDestinatarioDTO` lista `regiao` como obrigatório, mas descreve o campo
como "usado em prepostagens internacionais". **Contradição não resolvida** — só
homologação responde.

### 2.6 Rastreamento: não existe push

`SRO - Interatividade` foi verificada e **não é webhook**. Suas rotas são
`POST /v1/suspensao/{codigoObjeto}` (suspender entrega), `GET /v1/eventos` e
`GET /v1/eventos/{codigo}/{status}` (consulta). Descrição oficial: "registro de
solicitação de suspensão de entrega de objetos postados".

O rastreio é **consulta periódica**, via `GET /srorastro/v1/objetos/{codigo}`.

`GET /v1/eventos` devolve o catálogo oficial de códigos de evento — usar como fonte
do mapeamento evento → status do pedido, em vez do `STATUS_MAP` escrito à mão que
existe hoje no webhook do Melhor Envio.

### 2.7 Cotação

`POST /preco/v1/nacional` e `POST /prazo/v1/nacional` aceitam **lote** (até 100).
PAC, SEDEX e Mini Envios saem em uma chamada de cada. São **somente leitura**:
podem rodar em produção sem criar nem gastar nada.

## 3. Onde o Melhor Envio está cravado

Vinte e quatro arquivos citam o ME, mas o acoplamento real é este:

1. **`ShippingOption.id` é o service id do ME** (`lib/types.ts`). Vai do servidor ao
   navegador, volta no payload do checkout, é revalidado em `lib/actions/payments.ts`
   e gravado em `orders.melhor_envio_service_id`.
2. **`orders.melhor_envio_service_id` e `orders.melhor_envio_order_id`**
   (migration 010). A UI do painel liga botões por elas.
3. **`lib/server/label.ts`** — 400 linhas montando `MEAddress` / `MECartProduct` /
   `MEVolume` e orquestrando `addToCart → checkout → generate → tracking`.
4. **`store_settings.enabled_carriers`** — rótulos `"Empresa (Serviço)"`, vocabulário
   do ME.
5. **`app/api/webhooks/shipping/route.ts`** — push do ME, sem equivalente.
6. **`meDocumentFields()`** em `lib/documento.ts` — devolve `document` /
   `company_document`, nomes do ME. O resto do arquivo é genérico e se aproveita.

## 4. Desenho

### 4.1 O remetente é uma identidade própria

O `CLAUDE.md` seção 6.10 afirma que "emitente da NF-e e remetente da etiqueta são a
mesma PJ". **Isso deixou de ser verdade.** O contrato dos Correios é do CNPJ
20.187.705/0001-77 (LUIZ SERGIO DUARTE CARREIRA, pai do Henrique); a loja emite nota
pelo 38.142.237/0001-80 (H M T CARREIRA MODAS).

E o **nome/CNPJ** do remetente é o do titular do contrato, enquanto o **endereço** é
de onde a mercadoria sai (Muriaé/MG). São coisas separadas.

Migration acrescenta a `store_settings`:

- `carrier_sender_name text`
- `carrier_sender_cnpj text`

Editáveis em `/admin/config/envio`, rotulados como "quem aparece como remetente na
etiqueta". Vazio = usa a identidade fiscal. O endereço continua vindo de
`getShippingOrigin()`, que já funciona.

> O Henrique pretende abrir contrato no CNPJ dele. Quando sair, a troca tem que ser
> **configuração, não código** — é para isso que estes campos existem.

### 4.2 Camada neutra

```
lib/shipping/
  types.ts        ShippingQuote · ShipmentRequest · ShipmentResult · TrackingEvent
  carrier.ts      interface ShippingCarrier
  registry.ts     transportadoras ativas
  correios/
    token.ts      cache por escopo (24h; limite de 3 req/s)
    client.ts     fetch + tradução de erro
    quote.ts      POST /preco/v1/nacional + /prazo/v1/nacional (lote)
    shipment.ts   POST /prepostagem/v1/prepostagens
    label.ts      rótulo assíncrono em PDF
    tracking.ts   GET /srorastro/v1/objetos/{codigo}
    sanitize.ts   limites de campo da seção 2.5
  melhor-envio/   o código atual, movido e adaptado à interface
```

Um arquivo, uma responsabilidade, testável isolado. `lib/server/label.ts` deixa de
existir na forma atual.

### 4.3 Identidade da opção de frete

`ShippingOption.id` passa de `number` para **`string` no formato `"carrier:codigo"`** —
`"correios:03298"`, `"melhor-envio:1"`.

Campo composto, e não duas colunas, porque o id atravessa o navegador e volta: o
contrato de `payments.ts` (`quote.options.find(o => o.id === ...)`) continua idêntico,
só muda o tipo. E torna impossível confundir o serviço `1` dos Correios com o `1` do ME.

### 4.4 Banco

```sql
ALTER TABLE orders
  ADD COLUMN shipping_carrier      text,   -- 'correios' | 'melhor_envio'
  ADD COLUMN shipping_service_code text,   -- '03298'
  ADD COLUMN shipment_id           text;   -- id da pré-postagem
```

Backfill a partir das colunas antigas. **As antigas não são removidas**, só param de
ser lidas — pedidos históricos continuam íntegros.

### 4.5 Rastreio por tarefa agendada

Cron varrendo pedidos com `shipping_carrier = 'correios'`, status `separating` ou
`shipped`, e `tracking_code` preenchido. Consulta o SRO em lote. **3x ao dia** —
volume de loja pequena não justifica mais, e cada consulta gasta cota.

Vercel Cron. Isso diverge do CLAUDE.md global (que prefere `pg_cron`), e a razão é
que o job precisa do token dos Correios e do parse dos eventos, que vivem no Next —
colocar no banco espalharia a integração em dois lugares.

### 4.6 O que sai de cena

- `checkoutCart`, `generateLabel` e o estado "em preparo" — sem equivalente
- O webhook do ME fica no código, desligado
- `MELHOR_ENVIO_*` viram opcionais em `/admin/diagnostico`

## 5. Fases

| Fase | Escopo | Muda algo para o usuário? |
| --- | --- | --- |
| 1 | Camada neutra + migration; ME adaptado à interface | **Não.** Refactor puro. |
| 2 | Cotação pelos Correios no carrinho | Sim |
| 3 | Pré-postagem + rótulo | Sim |
| 4 | Rastreio por cron | Sim |
| 5 | Desligar o Melhor Envio | Sim |

Cada fase vai a produção sozinha. A Fase 1 não muda comportamento — é a base segura.

**Fases 1, 2 e 4 são seguras em produção** (nenhuma chamada que escreve). **Só a
Fase 3 cria objeto nos Correios** e exige homologação, ou um teste único autorizado
pelo Henrique com `DELETE` imediato.

## 6. Critérios de sucesso

1. O carrinho cota PAC, SEDEX e Mini Envios com **preço de contrato** — tem que sair
   menor que a cotação do Melhor Envio para o mesmo trecho.
2. Pedido pago gera pré-postagem e grava o `codigoObjeto` como rastreio em < 10s.
3. O rótulo em PDF baixa pelo painel.
4. A declaração de conteúdo sai junto, sem NF-e.
5. O cron altera o status de um pedido real.
6. Zero chamadas ao Melhor Envio no fluxo de varejo.
7. Pedido com logradouro de 60 caracteres e número de 8 caracteres **não** derruba
   a etiqueta.

## 7. Testes

Unitário no que quebra em silêncio: sanitização de campo, montagem do payload, cache
de token (incluindo o caso de dois escopos).

Integração contra homologação: cotar → pré-postar → baixar rótulo → cancelar.

## 8. Riscos em aberto

| Risco | Estado |
| --- | --- |
| CNPJ do contrato ≠ CNPJ da loja | Henrique vai confirmar com o contador e pretende abrir contrato próprio |
| Contrato é DR SE/BA, mercadoria sai de Muriaé/MG | Pendente com o Henrique |
| `regiao` obrigatório no endereço do destinatário | Só homologação responde |
| Homologação | Solicitada pelo contato dos Correios (Vinicius) |

Nenhum bloqueia a Fase 1.
