// Rótulo e cor de categoria de produto.
//
// A categoria é texto livre na tabela products. Antes o relatório tinha uma lista
// fixa de três slugs e qualquer outra — 'bazar', por exemplo — aparecia crua e
// cinza no gráfico. Aqui o rótulo conhecido é um atalho, não um requisito:
// categoria nova ganha rótulo capitalizado e cor própria sem precisar de deploy.

const KNOWN_LABELS: Record<string, string> = {
  bolsas: 'Bolsas',
  roupas: 'Roupas',
  acessorios: 'Acessórios',
  bazar: 'Bazar',
  infantil: 'Infantil',
  almofadas: 'Almofadas',
  lancamentos: 'Lançamentos',
}

export function categoryLabel(slug: string): string {
  const known = KNOWN_LABELS[slug]
  if (known) return known
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' ')
}

// Paleta ordenada por distinção: cada cor difere da anterior em matiz E em
// luminosidade, para as fatias continuarem separáveis também em preto e branco
// (o relatório é impresso em PDF) e para quem não distingue verde de vermelho.
//
// A primeira versão sorteava a cor por hash dentro de uma paleta qualquer, e
// 'bolsas' e 'bazar' calhavam de cair em azul #4a6fa5 e verde-água #3f7d75 —
// matiz vizinho e mesma luminosidade, praticamente indistinguíveis no donut.
// A ordem importa: vizinhas na lista alternam claro e escuro, então duas fatias
// consecutivas se separam por matiz E por luminosidade. Isso é o que mantém o
// gráfico legível no "Exportar PDF" em preto e branco e para quem não distingue
// verde de vermelho — matiz sozinho não resolve nenhum dos dois casos.
const PALETTE = [
  '#c1583c', // terracota   — média
  '#2f5d8a', // azul        — escura
  '#e0b64e', // âmbar       — clara
  '#6b3f16', // castanho    — muito escura
  '#4bb3c4', // turquesa    — clara
  '#7b3fa0', // roxo        — escura
  '#e8a0b4', // rosa        — muito clara
  '#2f6b34', // verde       — escura
]

/**
 * Cores de um conjunto de categorias.
 *
 * A posição vem da ordem alfabética do conjunto, não de um hash: assim duas
 * categorias quaisquer caem em posições vizinhas da paleta, que foi montada
 * justamente para ser contrastante entre vizinhas. A alternativa que tentei
 * antes — hash do slug com desvio em caso de colisão — produzia pares como
 * vinho e roxo com luminância idêntica, indistinguíveis no PDF.
 *
 * O preço: cadastrar uma categoria nova pode reordenar as cores das existentes.
 * É aceitável porque acontece raramente e a legenda sempre nomeia cada cor.
 */
export function assignCategoryColors(slugs: string[]): Map<string, string> {
  const result = new Map<string, string>()
  const ordered = Array.from(new Set(slugs)).sort()

  ordered.forEach((slug, i) => {
    result.set(slug, PALETTE[i % PALETTE.length])
  })

  return result
}

/** Cor de uma categoria isolada, fora de um gráfico. */
export function categoryColor(slug: string): string {
  return assignCategoryColors([slug]).get(slug)!
}
