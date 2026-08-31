# Investigação — "CNPJ do emitente não autorizado" no Focus NFe

> **Leia a seção 10 antes da 3.** A hipótese da seção 3 foi medida e
> descartada em 26/08/2026. A causa confirmada está na seção 4.

Escrito em 26/08/2026. A emissão de NF-e **nunca funcionou neste projeto**: o banco tem
zero notas em 50+ pedidos. Hoje o caminho avançou até o Focus e para na autorização.

## 1. O erro

```
[emitirNfe] Erro ao emitir NF-e para pedido aeab59c6-… :
[Focus NFe] Erro da API: CNPJ do emitente não autorizado.
```

Aparece no log de runtime da Vercel e também na tela, no detalhe do pedido em
`/admin/pedidos`, sob "NOTA FISCAL — Erro na emissão".

## 2. O que já foi descartado

- **NCM.** O código aborta antes de chamar o Focus quando falta NCM. Como o erro vem da
  API, o NCM passou. A Bolsa Briana tem `42022200` e é o único produto com NCM cadastrado —
  use ela em qualquer teste.
- **Certificado.** Subiu no painel do Focus e aparece como válido até 13/01/2027. e-CNPJ
  A1, `H M T CARREIRA MODAS`, CNPJ 38142237000180.
- **Formato do payload.** Confere com a API v2 do Focus: `POST /v2/nfe?ref=<ref>`, Basic
  auth com o token como usuário e senha vazia, `emitente.cnpj` no corpo. Ver
  `lib/integrations/focus-nfe.ts`.
- **Token de ambiente errado.** O Leonardo confirmou ter usado o token de **homologação**.
- **Variáveis desatualizadas no deploy.** A primeira falha rodou num deploy anterior às
  mudanças de variável, mas o erro se repetiu no deploy seguinte, já com os valores novos.

## 3. A hipótese ainda não verificada — comece por ela

`lib/integrations/focus-nfe.ts` decide o host assim:

```ts
function isHomologacao(): boolean {
  return (process.env.FOCUS_NFE_AMBIENTE ?? 'producao').trim() === 'homologacao'
}
// homologacao → https://homologacao.focusnfe.com.br/v2
// qualquer outra coisa → https://api.focusnfe.com.br/v2
```

Comparação exata, e `.trim()` só remove espaço. **Qualquer sujeira no valor manda a
requisição para o servidor de produção** — onde um token de homologação de fato não
autoriza aquele CNPJ, produzindo exatamente esta mensagem.

E há motivo concreto para suspeitar: no `.env.local` essas linhas têm comentário inline.
O valor de `FOCUS_NFE_AMBIENTE` ali mede 51 caracteres, o de `STORE_CNPJ` 56, o de
`STORE_IE` 80, o de `FOCUS_NFE_REGIME_TRIBUTARIO` 66. O dotenv corta o `#`; **o campo da
Vercel não corta**. Se o valor foi colado de lá, veio o comentário junto.

`STORE_CNPJ` se salva sozinha, porque `onlyDigits()` limpa tudo. As outras três, não:

- `FOCUS_NFE_AMBIENTE` → cai em produção em silêncio
- `FOCUS_NFE_REGIME_TRIBUTARIO` → `Number("1 # …")` vira `NaN`, e o campo sai nulo na nota
- `STORE_IE` → o comentário vai junto para dentro da nota

**Primeira ação:** confirmar na Vercel que `FOCUS_NFE_AMBIENTE` é exatamente
`homologacao`, sem comentário, sem acento, minúsculo — e o mesmo cuidado nas outras.
Variável só passa a valer no deploy seguinte.

## 4. Se não for isso

Em ordem de probabilidade:

1. **A empresa não existe ou não está habilitada no ambiente de homologação.** No Focus os
   dois ambientes são separados; empresa cadastrada num não aparece automaticamente no
   outro. Verificar no painel e, se preciso, abrir chamado.
2. **Token de outra natureza.** O Focus tem token de conta e token por empresa. O correto
   aqui é o **da empresa**, no ambiente correspondente.
3. **Conta em período de teste com limitação.** O painel avisa "seu período de teste
   encerra em 9 dias" (por volta de 04/09/2026). Confirmar se o teste permite emitir.

## 5. Como diagnosticar sem chutar

- **Chamar a API do Focus direto**, com o token, foi a técnica que resolveu os outros
  problemas de integração deste projeto em minutos. `GET /v2/nfe/<ref-inexistente>`
  distingue os casos: 404 autentica, 403 recusa a credencial.
- **`/admin/diagnostico`** não serve para isto: ele trata 404 como "token aceito", o que
  prova autenticação mas **não** autorização para o CNPJ. Foi por isso que ficou verde
  enquanto a emissão falhava. Vale melhorar a tela para mostrar o **host** efetivamente
  chamado — isso teria matado a dúvida em um olhar.
- **Logs de runtime da Vercel** pelo MCP, filtrando por `Focus`. Projeto
  `prj_0e70xUup8Tn7c6MD2OmGLdd4sKNZ`, time `team_OyYVusZ76w1OTIAJEn8Y98lD`.

## 6. Blindagem sugerida (não feita ainda)

O mesmo tipo de falha — variável de ambiente malformada quebrando em silêncio — custou
horas hoje em três frentes diferentes. Vale:

- Cortar comentário inline e comparar sem diferenciar maiúsculas na leitura de
  `FOCUS_NFE_AMBIENTE`, `MELHOR_ENVIO_BASE_URL` e afins
- Fazer `/admin/diagnostico` exibir o host de cada integração
- Fazer o erro de emissão guardar o host usado, para o log responder sozinho

## 7. Documentação de referência

- https://doc.focusnfe.com.br/reference/ambiente
- https://doc.focusnfe.com.br/reference/autenticacao
- https://doc.focusnfe.com.br/reference/referencia
- https://doc.focusnfe.com.br/reference/nfe
- https://doc.focusnfe.com.br/reference/emitir_nfe

## 8. Depois que emitir — o que vem em seguida

Nenhum destes é a causa do erro atual, mas os três aparecem logo depois:

- **Inscrição Estadual.** `STORE_IE` está vazia e no Focus também. Empresa no Simples
  vendendo mercadoria precisa de IE, senão a SEFAZ rejeita. Depende do cartão CNPJ — e o
  certificado diz `ST=RJ, ARMACAO DOS BUZIOS` enquanto o emitente está configurado como
  Porto Seguro/BA. Confirmar em que estado a empresa está inscrita.
- **CSOSN.** O código manda `icms_modalidade: '400'` ("não tributada pelo Simples") com
  `codigo_regime_tributario: 1`. Loja vendendo mercadoria no Simples costuma usar `102`.
  É pergunta para o contador, não para o desenvolvedor.
- **NCM dos outros 27 produtos.** Só a Briana tem. `docs/ncm-produtos.csv` está pronto
  para o contador preencher.

## 9. Não fazer

**Não trocar para o ambiente de produção para "fazer a nota sair".** Isso emitiria
documento fiscal real, com valor jurídico, para vendas de teste. Homologação é o ambiente
certo aqui — o código já injeta "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR
FISCAL" na nota.
---

## 10. Conclusão medida (26/08/2026)

### A hipótese da seção 3 está descartada — por medição, não por dedução

A doc de emissão separa dois erros que o código tratava igual: token inválido é
**401 `Access token inválido`**; `permissao_negada` / "CNPJ do emitente não
autorizado" é **422**. Sondando os dois hosts com um token falso (GET numa ref
inexistente — leitura pura, não emite nada), ambos respondem 401, e o Focus
nomeia o host na própria mensagem:

```
homologacao.focusnfe.com.br → 401 {"codigo":"permissao_negada","mensagem":"Access token inválido (host: homologacao.focusnfe.com.br)"}
api.focusnfe.com.br         → 401 {"codigo":"permissao_negada","mensagem":"Access token inválido (host: api.focusnfe.com.br)"}
```

E a doc de autenticação fecha: *"muda apenas a URL base do servidor **e o
token**"* — token é por ambiente. Logo, se `FOCUS_NFE_AMBIENTE` estivesse
contaminado e a requisição saísse para produção com token de homologação, o erro
seria **401**, não o 422 que aparece no log.

O indício do `.env.local` também não se sustenta: o formato lá tem mesmo
comentário inline, mas **o `.env.local` não espelha a Vercel** — o Leonardo
confirmou que token e webhook secret existem só na Vercel. Pior: as 30 variáveis
do projeto são do tipo **Secret**, write-only — o valor não sai pelo
`vercel env pull` nem aparece no dashboard. Não dá para auditá-las por leitura.

### O que foi medido no ambiente real

Deploy de preview com o `/admin/diagnostico` melhorado (as variáveis relevantes
estão numa entrada única *Production, Preview* — mesmo valor nos dois). A linha
Focus NFe respondeu:

```
ambiente: homologação · homologacao.focusnfe.com.br
detalhe:  token aceito · emitente CNPJ 38142237000180
```

Ou seja: **host certo, token aceito, CNPJ certo e válido no dígito verificador.**

### A causa é a seção 4, itens 1 e 2

Com host, token e CNPJ confirmados, só resta uma leitura para o 422: **o token
configurado não pertence ao CNPJ 38142237000180 no ambiente de homologação.** Em
concreto: a empresa foi cadastrada no ambiente de **produção** do painel — que é
onde o certificado subiu — e nunca foi habilitada em homologação; ou o token é de
outra empresa da conta (contas em teste costumam vir com uma empresa de exemplo).

**Isso é cadastro no Focus. Nenhuma mudança de código faz a nota sair.**
Próximo passo: painel do Focus, trocar para o ambiente de homologação, verificar
se a empresa aparece e está habilitada para NF-e; se não, cadastrar ali e usar o
token que esse ambiente gerar.

### Blindagem da seção 6 — feita

Commits `60a5161` e `ae91204` na branch `claude/nfe-cnpj-nao-autorizado-5d9c7b`
(sem push):

- `lib/env.ts` novo: `readEnv` corta comentário inline, `readEnvOption` compara
  sem caixa, `readEnvNumber` tem fallback. Aplicado em Focus, Melhor Envio e
  remetente da etiqueta.
- O host da requisição vai no erro da API — o log passa a responder sozinho.
- `STORE_CNPJ` validado por dígito verificador **antes** da chamada, com o nome
  da variável na mensagem.
- `/admin/diagnostico` mostra o host chamado e o CNPJ do emitente resolvido, e
  não conta mais valor só-comentário como preenchido — era por isso que a tela
  ficava verde enquanto a emissão falhava.
- `.env.example` com comentários em linha própria; `.gitignore` cobrindo
  `.env*.local`.

### Uma decisão em aberto para o Leonardo

`isHomologacao()` continua caindo em **produção** quando a variável falta ou não
é reconhecida — comportamento original, mantido de propósito. Dado a seção 9,
errar para o lado de produção é a direção perigosa: um typo emitiria documento
fiscal real. Inverter o default é decisão com consequência fiscal.
---

## 11. Teste após habilitar NFe no painel (31/08/2026)

O Leonardo encontrou o **NFe desligado** na aba "Documentos Fiscais" da empresa
no painel do Focus, e ligou (série 1, próximo número 1, envio síncrono
desligado nos dois ambientes). Também preencheu a Inscrição Estadual.

Nova tentativa de emissão às 20:27:45, no preview com o código novo:

```
[Focus NFe] Erro da API (HTTP 403, host: homologacao.focusnfe.com.br): CNPJ do emitente não autorizado.
```

### Correção de um fato da seção 10

A tabela de erros da doc lista `permissao_negada` / "CNPJ do emitente não
autorizado" como **422**. A API **responde 403**. Não muda a conclusão — muda o
código que se deve procurar. A escala real, medida:

| HTTP | Significado |
| ---- | ----------- |
| 401  | `Access token inválido` — o token não existe naquele ambiente |
| 403  | token existe e autentica, mas **não tem permissão para aquele CNPJ** |
| 404  | token OK, autorizado, e a nota consultada é que não existe |

### O que o 403 elimina

Habilitar o NFe não resolveu, então não era só isso. E como 403 não é 401, o
token **é** um token válido de homologação daquela conta Focus. O que sobra:
**o token configurado em `FOCUS_NFE_TOKEN` não é o token desta empresa.** Ou é o
token principal da conta, ou o de outra empresa cadastrada nela.

O token correto está na aba **TOKENS** da empresa, no painel — há um por
ambiente. Próximo passo: copiar o de homologação para `FOCUS_NFE_TOKEN` na
Vercel e redeployar.

### Pendência que aparece logo depois — Inscrição Estadual de outro estado

A IE preenchida (`004260862.00-43`) é de **Minas Gerais** — 13 dígitos, formato
MG. O emitente está configurado como **Porto Seguro/BA** (`STORE_CIDADE`,
`STORE_ESTADO`) e o certificado A1 diz **Armação dos Búzios/RJ**. São três
estados. A SEFAZ exige IE do mesmo estado do endereço do emitente, então isso
será recusado assim que a autorização passar. O número veio de site de consulta
com anúncios, não de fonte oficial: confirmar no **cartão CNPJ**.

Vale notar também que `STORE_IE` na Vercel segue vazia, e o código manda
`inscricao_estadual` no corpo a partir dela — preencher o painel do Focus não
preenche a variável.
---

## 12. Token da empresa trocado — mesmo 403 (31/08/2026)

Token de homologação copiado da aba **TOKENS** da empresa no painel do Focus e
gravado em `FOCUS_NFE_TOKEN` na Vercel. Deploy novo (`dpl_6D5ufPSVuqSdE8UGXcuCzaPkGrCe`).
Duas tentativas, em dois pedidos, às 20:44:48 e 20:44:55:

```
[Focus NFe] Erro da API (HTTP 403, host: homologacao.focusnfe.com.br): CNPJ do emitente não autorizado.
```

### O que isso fecha

O 403 **prova que o token é de homologação** — se fosse o de produção colado por
engano, o host de homologação responderia 401 (`Access token inválido`), como
medido na seção 10. Então não houve erro de cópia entre as duas colunas.

Situação: host certo, token certo e da empresa, CNPJ certo e válido no dígito,
NFe habilitado em Documentos Fiscais, certificado A1 válido até 13/01/2027 — e
ainda assim o Focus recusa a autorização daquele CNPJ.

**Esgotou o que se resolve do lado do projeto.** Nada em código, variável de
ambiente ou deploy muda esse 403. Resta a seção 4, item 3: conta em período de
teste com limitação, ou cadastro da empresa em homologação pendente de liberação
do lado do Focus. É chamado no suporte.

### Texto do chamado (suporte@focusnfe.com.br)

> Assunto: HTTP 403 "CNPJ do emitente não autorizado" em homologação — CNPJ 38.142.237/0001-80
>
> Olá,
>
> Não consigo emitir NF-e em homologação para a empresa H M T CARREIRA MODAS,
> CNPJ 38.142.237/0001-80. A API responde:
>
> POST https://homologacao.focusnfe.com.br/v2/nfe?ref=<ref>
> HTTP 403 — {"codigo":"permissao_negada","mensagem":"CNPJ do emitente não autorizado."}
>
> Já verifiquei do meu lado:
>
> - Autenticação HTTP Basic com o token de **homologação da empresa**, copiado da
>   aba TOKENS no painel (token como usuário, senha vazia). Que o token é o de
>   homologação está confirmado: um token inválido retorna 401 "Access token
>   inválido" nesse mesmo host, e eu recebo 403, não 401.
> - NFe está habilitado na aba Documentos Fiscais da empresa (série 1, próximo
>   número 1).
> - Certificado digital A1 consta como válido no painel, até 13/01/2027.
> - O campo emitente.cnpj do payload vai como 38142237000180, somente dígitos.
>
> Minha conta está em período de teste (encerra por volta de 04/09/2026).
>
> Um dado que pode ser relevante: a empresa está cadastrada com Inscrição
> Estadual 004260862.00-43, que é de Minas Gerais, enquanto o endereço da loja
> é em Porto Seguro/BA. Observo que o erro 403 já ocorria antes de eu preencher
> a IE, e continuou depois.
>
> 1) O que falta para este CNPJ ser autorizado a emitir em homologação?
> 2) O período de teste bloqueia a emissão em homologação?
> 3) Uma inconsistência entre a Inscrição Estadual e a UF do endereço impede a
>    liberação da empresa para emissão? Se sim, qual dado devo corrigir?
>
> Obrigado.

### Pergunta separada, para o contador — não para o Focus

A Inscrição Estadual cadastrada (`004260862.00-43`) é de **Minas Gerais**,
enquanto o emitente está como Porto Seguro/BA e o certificado A1 diz Armação dos
Búzios/RJ. Antes de emitir de verdade é preciso saber, pelo **cartão CNPJ**, em
que estado a empresa está inscrita — e alinhar `STORE_IE`, `STORE_CIDADE` e
`STORE_ESTADO` a esse estado. `STORE_IE` na Vercel segue vazia: preencher o
painel do Focus não preenche a variável.
