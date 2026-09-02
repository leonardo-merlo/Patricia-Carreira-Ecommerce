// Leitura de variável de ambiente tolerante a comentário inline.
//
// O dotenv corta o `# comentário` ao carregar o .env.local; o campo da Vercel não
// corta. Colar a linha inteira do arquivo lá dentro leva o comentário para dentro
// do valor, e toda comparação exata passa a falhar em silêncio: `FOCUS_NFE_AMBIENTE`
// deixa de ser 'homologacao' e a emissão vai para o host de produção sem erro
// visível, `Number()` do regime tributário vira NaN, e um valor que só tem
// comentário é lido como preenchido.

/**
 * Remove comentário inline e espaço nas pontas.
 *
 * O `#` só é cortado no começo do valor ou precedido de espaço: token e segredo
 * podem conter `#` colado ao resto do valor, e cortar ali destruiria a credencial.
 */
export function stripInlineComment(raw: string): string {
  return raw.replace(/(^|\s)#[\s\S]*$/, '$1').trim()
}

/** Valor da variável, já sem comentário inline nem espaço nas pontas. */
export function readEnv(name: string): string {
  return stripInlineComment(process.env[name] ?? '')
}

/**
 * Valor para comparar com uma opção fixa ('homologacao', 'sandbox'…).
 * Em minúsculas, porque `Homologacao` é a mesma intenção e a comparação exata
 * mandaria a requisição para o ambiente errado.
 */
export function readEnvOption(name: string): string {
  return readEnv(name).toLowerCase()
}

