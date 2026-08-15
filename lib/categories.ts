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

// Paleta da marca. Uma categoria sempre recebe a mesma cor porque o índice vem
// de um hash do slug — sem isso a fatia mudaria de cor a cada novo produto
// cadastrado, já que a ordem do gráfico é por faturamento.
const PALETTE = [
  '#c97d60', // terracota
  '#6B6B2A', // oliva
  '#d8c89a', // areia
  '#7c3aed', // roxo
  '#3f7d75', // verde-água
  '#a0522d', // castanho
  '#4a6fa5', // azul
  '#b8860b', // dourado
]

export function categoryColor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
