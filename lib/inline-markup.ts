// Markup mínimo das mensagens do banner: [texto](url) e **negrito**.
//
// É um parser fechado de propósito. O conteúdo vem do banco e vai para a home da
// loja — renderizar HTML livre com dangerouslySetInnerHTML transformaria o campo
// de texto do painel numa porta de XSS. Aqui o que não casa com os dois padrões
// vira texto puro, sempre.

export type MarkupToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'link'; label: string; href: string; external: boolean }

const TOKEN_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g

/**
 * Só caminho interno, http(s) e mailto. Sem isto, `[clique](javascript:...)`
 * viraria um link executável.
 */
function safeHref(href: string): { href: string; external: boolean } | null {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return { href, external: false }
  }
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
    return { href, external: true }
  }
  return null
}

export function parseInlineMarkup(content: string): MarkupToken[] {
  const tokens: MarkupToken[] = []
  let lastIndex = 0

  // A regex é global e reusada entre chamadas; zerar lastIndex evita que um
  // parse comece de onde o anterior parou.
  TOKEN_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = TOKEN_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }

    const [full, boldText, linkLabel, linkHref] = match

    if (boldText !== undefined) {
      tokens.push({ type: 'bold', value: boldText })
    } else if (linkLabel !== undefined && linkHref !== undefined) {
      const safe = safeHref(linkHref)
      // URL recusada vira texto puro — melhor a frase aparecer sem link do que
      // sumir ou virar algo clicável que ninguém revisou.
      if (safe) {
        tokens.push({ type: 'link', label: linkLabel, href: safe.href, external: safe.external })
      } else {
        tokens.push({ type: 'text', value: full })
      }
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < content.length) {
    tokens.push({ type: 'text', value: content.slice(lastIndex) })
  }

  return tokens
}

/** O link do WhatsApp ganha o ícone, como já era no banner fixo. */
export function isWhatsAppHref(href: string): boolean {
  return /^https?:\/\/(www\.)?(wa\.me|api\.whatsapp\.com)/i.test(href)
}
