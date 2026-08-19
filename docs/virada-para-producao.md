# Virada para produção — Patrícia Carreira

Sequência para sair de teste e passar a vender de verdade. Hoje as três integrações de dinheiro
e logística estão em ambiente de teste: Mercado Pago com credencial `TEST-`, Melhor Envio em
sandbox e Focus NFe em homologação. Este documento é o roteiro; nada aqui foi executado.

Escrito em 19/08/2026. As decisões já fechadas estão na seção 12 do [CLAUDE.md](../CLAUDE.md).

## Antes de começar

Duas coisas valem para o roteiro inteiro:

- **A ordem importa.** Cada bloco abaixo depende do anterior. Virar o pagamento antes da nota
  fiscal deixa a loja aceitando dinheiro real sem conseguir emitir NF-e; virar a nota antes do
  CNPJ e da IE corretos emite documento fiscal errado, que só se resolve com cancelamento ou
  carta de correção.
- **`/admin/diagnostico` é o painel de conferência.** Ele lista cada variável de ambiente
  exigida, mostra as três URLs de webhook prontas para colar em cada painel e valida o
  documento e o CEP do remetente do frete. Abrir essa tela depois de cada bloco é a forma mais
  rápida de saber se a virada pegou.

Todas as variáveis são trocadas no painel da Vercel (Project → Settings → Environment
Variables), ambiente Production, e só valem depois de um novo deploy. Trocar variável não
redeploya sozinho.

## Passo 0 — identidade fiscal (trava tudo o que vem depois)

Nada de nota fiscal pode ser virado enquanto estes três itens não estiverem fechados.

1. **Estado de inscrição da empresa.** O certificado A1 entregue traz `ST=RJ, L=ARMACAO DOS
   BUZIOS`, mas o emitente está configurado como Porto Seguro/BA. Conferir no cartão CNPJ em
   que estado a empresa está inscrita — isso decide a Inscrição Estadual e qual SEFAZ autoriza
   a nota. Decide também se o CFOP das vendas é 5102 (dentro do estado) ou 6102 (fora), porque
   o código usa `STORE_ESTADO` para escolher.
2. **`STORE_IE`.** Está vazia. O número precisa vir do cartão CNPJ ou do contador — o que já
   circulou foi encontrado na internet e não serve.
3. **NCM dos 28 produtos ativos.** Hoje apenas 1 dos 28 tem NCM cadastrado, e sem NCM a nota
   não sai. A planilha para o contador preencher está em
   [docs/ncm-produtos.csv](ncm-produtos.csv). NCM errado em produção é multa: quem define é o
   contador, não o sistema.

## Passo 1 — dados do emitente e do remetente

Ainda sem trocar credencial nenhuma, com os dados reais em mãos:

| Variável | O que é |
| --- | --- |
| `STORE_CNPJ` | CNPJ sem pontuação. Precisa ser o mesmo do certificado A1: `38142237000180` |
| `STORE_IE` | Inscrição Estadual, ou `ISENTO` |
| `STORE_CNAE` | CNAE da atividade principal |
| `STORE_NOME` | Razão social que vai no emitente da nota |
| `STORE_LOGRADOURO`, `STORE_NUMERO`, `STORE_COMPLEMENTO`, `STORE_BAIRRO`, `STORE_CIDADE`, `STORE_ESTADO` | Endereço real do emitente e do remetente do frete |
| `STORE_CEP_ORIGEM` | CEP de onde as encomendas saem — é a origem da cotação de frete |
| `STORE_DOCUMENTO` | CPF/CNPJ do remetente no Melhor Envio |
| `STORE_TELEFONE`, `STORE_EMAIL` | Contato do remetente |

O `.env.example` ainda traz um endereço de exemplo (`Rua das Flores, 123`) e
`STORE_DOCUMENTO=00000000000000`. Nenhum dos dois pode sobreviver à virada: o Melhor Envio
valida dígito verificador de documento e formato de CEP, e devolve 422 com o pedido inteiro
barrado.

Conferência: `/admin/diagnostico` mostra o documento resolvido e diz se o dígito confere.

## Passo 2 — Mercado Pago para produção

1. No painel do Mercado Pago (Seu negócio → Credenciais), copiar as credenciais de
   **produção** da aplicação — as que **não** começam com `TEST-`.
2. Trocar na Vercel: `MERCADOPAGO_ACCESS_TOKEN` e `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`.
3. Gerar e trocar `MERCADOPAGO_WEBHOOK_SECRET` — o segredo do webhook de produção é outro, e
   a assinatura HMAC do callback é validada contra ele.
4. Cadastrar o webhook de produção em Suas integrações → aplicação → Webhooks, evento
   **Pagamentos**, apontando para `https://<domínio>/api/webhooks/payment`.
5. Redeployar e fazer **uma compra real de valor baixo**, com cartão de verdade, e conferir o
   pedido em `/admin/pedidos`.

Ponto de atenção: o `notification_url` que o código manda ao Mercado Pago é montado a partir de
`NEXT_PUBLIC_APP_URL`. Se essa variável apontar para localhost ou para uma URL de preview, o
Mercado Pago para de notificar e o pedido fica pendente para sempre, **sem erro visível**.

## Passo 3 — Melhor Envio na conta real

Este é o passo com a pegadinha documentada.

1. Criar/usar a conta real do Melhor Envio e gerar o token OAuth de produção.
2. Trocar na Vercel: `MELHOR_ENVIO_TOKEN` e `MELHOR_ENVIO_BASE_URL`
   (de sandbox para `https://www.melhorenvio.com.br/api/v2`).
3. **Recadastrar a URL do webhook no painel de produção.** A configuração do sandbox não
   migra: o webhook cadastrado no ambiente de teste simplesmente não existe do lado de
   produção, e ninguém avisa. A URL é
   `https://<domínio>/api/webhooks/shipping?token=<MELHOR_ENVIO_WEBHOOK_SECRET>`, em
   Configurações → Webhooks. Sem isso o rastreio nunca chega e o pedido fica parado em
   "enviado" sem código.
4. Confirmar que `MELHOR_ENVIO_WEBHOOK_SECRET` está definido — o webhook rejeita a chamada sem
   token válido, e se a variável estiver vazia o endpoint recusa tudo.
5. Colocar saldo na conta do Melhor Envio. O fluxo de etiqueta paga o frete de verdade; sem
   saldo, o checkout do ME falha depois do carrinho.
6. Testar cotação na loja e gerar **uma etiqueta real** de ponta a ponta.

O token OAuth do Melhor Envio **expira** e precisa ser renovado no painel. Vale anotar a data.

## Passo 4 — Focus NFe de homologação para produção

Só depois que o passo 0 e o passo 1 estiverem fechados.

1. Subir o certificado A1 **no painel do Focus NFe** — nunca no repositório. É o e-CNPJ
   tipo A1 já conferido, titular `H M T CARREIRA MODAS`, CNPJ `38142237000180`, válido até
   **13/01/2027**. Anotar esse vencimento em algum lugar que dispare aviso: quando ele passar,
   a emissão para.
2. Trocar na Vercel: `FOCUS_NFE_TOKEN` (o token de produção é diferente do de homologação) e
   `FOCUS_NFE_AMBIENTE=producao`.
3. Conferir `FOCUS_NFE_REGIME_TRIBUTARIO` (1 = Simples Nacional).
4. Recadastrar a URL de callback no painel do Focus, em Configurações → URL de callback:
   `https://<domínio>/api/webhooks/nfe?token=<FOCUS_NFE_WEBHOOK_SECRET>`.
5. Emitir **uma nota de teste com valor real baixo** e conferir o DANFE. Se sair errado, é aqui
   que se descobre — não na primeira venda do cliente.

Enquanto o passo 0 não fechar, deixar `auto_nfe_retail` desligado em `/admin/config`. Com ele
ligado, todo pagamento confirmado dispara emissão automática; com NCM ou IE errados isso vira
uma sequência de notas recusadas ou, pior, autorizadas erradas.

## Passo 5 — domínio, e-mail e URL da aplicação

1. Apontar o domínio definitivo na Vercel. Enquanto ele não existir, a loja fica em
   `https://patricia-carreira-ecommerce.vercel.app`.
2. Trocar `NEXT_PUBLIC_APP_URL` para a URL final, **sem barra no fim**.
3. **Recadastrar os três webhooks** com o novo domínio — Mercado Pago, Melhor Envio e Focus
   NFe, um painel de cada vez. Trocar `NEXT_PUBLIC_APP_URL` sem fazer isso quebra os três em
   silêncio.
4. Confirmar o domínio no Resend e ajustar `RESEND_FROM` para um remetente verificado nesse
   domínio. E-mail de confirmação que cai em spam é problema de reputação de domínio, não de
   código.
5. Configurar SMTP próprio e os modelos de e-mail no Supabase Auth (confirmação de conta,
   redefinição de senha) e revisar as Redirect URLs para o domínio novo. Isso é painel do
   Supabase — não há MCP nem API que faça daqui.

Deixar este passo por último tem um custo: os webhooks precisam ser recadastrados duas vezes se
o domínio mudar depois. Se o domínio já estiver decidido, vale fazer o passo 5 **antes** do 2,
3 e 4, para cadastrar cada webhook uma vez só.

## Passo 6 — segurança e conferência final

- **Password policy do Supabase Auth.** A regra de senha forte (8+, maiúscula, minúscula,
  número, especial) hoje é validada só no navegador. O gate de verdade é a policy em
  Authentication → Policies, que continua no padrão de 6 caracteres. Elevar antes de abrir
  cadastro para o público.
- **Peso e dimensões dos produtos.** Regra 13 do CLAUDE.md: produto sem peso e dimensões não
  cota frete. Conferir os 28 ativos antes de publicar.
- **Rodar `/admin/diagnostico` uma última vez** e conferir que todas as variáveis obrigatórias
  aparecem preenchidas e as três URLs de webhook aparecem prontas.
- **Uma compra real completa, ponta a ponta**, com dinheiro de verdade: pagamento aprovado,
  estoque decrementado, e-mail recebido, NF-e emitida, etiqueta gerada, rastreio chegando pelo
  webhook. Só depois disso a loja está virada.

## Ordem resumida

```
0. Identidade fiscal (estado de inscrição, IE, NCM)   ← trava 1 e 4
1. Dados do emitente e do remetente
5. Domínio + NEXT_PUBLIC_APP_URL + Resend + Supabase Auth   ← se o domínio já estiver decidido
2. Mercado Pago produção  (+ webhook)
3. Melhor Envio conta real (+ webhook recadastrado, saldo)
4. Focus NFe produção     (+ certificado A1, callback)
6. Segurança e compra real de ponta a ponta
```

Se o domínio ainda não estiver decidido, rodar 2, 3 e 4 na URL da Vercel e repetir só o
recadastro dos três webhooks quando o domínio entrar.
