import type { Config } from 'tailwindcss'

/**
 * Design System — Patrícia Carreira
 *
 * Tokens extraídos do protótipo HTML e convertidos para uso
 * com Next.js 14 + Tailwind CSS compilado.
 *
 * ⚠️  ATENÇÃO AO MIGRAR:
 *  - No CDN do Tailwind (protótipo), spacing é usado em max-w-* também.
 *  - No Tailwind compilado, max-w-* usa theme.maxWidth separadamente.
 *  - Por isso `container-max` aparece em AMBOS: spacing e maxWidth.
 *
 * Fontes necessárias no layout.tsx (next/font ou Google Fonts):
 *  - Playfair Display (400, 600, 700 + italic)
 *  - Be Vietnam Pro (400, 600)
 *  - Work Sans (600)
 *  - Material Symbols Outlined (icon font)
 */
const config: Config = {
  darkMode: 'class',

  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    // ─── Breakpoints ─────────────────────────────────────────────────────────
    // Mantém os defaults do Tailwind. O protótipo usa md: (768px) como divisor
    // principal entre mobile e desktop.

    extend: {
      // ─── Paleta de cores ───────────────────────────────────────────────────
      // Sistema Material Design 3 customizado para a marca.
      // Nomenclatura semântica: use os nomes, não os hexadecimais diretamente.
      colors: {
        // Cor primária — terracota queimado
        'primary':                  '#823b18',
        'primary-fixed':            '#ffdbcd',
        'primary-fixed-dim':        '#ffb596',
        'primary-container':        '#a0522d',
        'on-primary':               '#ffffff',
        'on-primary-fixed':         '#360f00',
        'on-primary-fixed-variant': '#76320f',
        'on-primary-container':     '#ffe1d6',
        'inverse-primary':          '#ffb596',

        // Cor secundária — azul cobalto (destaque editorial)
        'secondary':                '#2559bd',
        'secondary-fixed':          '#dae2ff',
        'secondary-fixed-dim':      '#b1c5ff',
        'secondary-container':      '#6c98ff',
        'on-secondary':             '#ffffff',
        'on-secondary-fixed':       '#001946',
        'on-secondary-fixed-variant': '#00419e',
        'on-secondary-container':   '#002f76',

        // Cor terciária — dourado envelhecido
        'tertiary':                 '#6b4900',
        'tertiary-container':       '#8b5f00',
        'tertiary-fixed':           '#ffdead',
        'tertiary-fixed-dim':       '#ffba3d',
        'on-tertiary':              '#ffffff',
        'on-tertiary-fixed':        '#281900',
        'on-tertiary-fixed-variant': '#604100',
        'on-tertiary-container':    '#ffe3bd',

        // Surfaces — fundos e containers
        'background':               '#fff8ef',
        'surface':                  '#fff8ef',
        'surface-bright':           '#fff8ef',
        'surface-dim':              '#e1d9cb',
        'surface-variant':          '#e9e2d3',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#fbf3e4',
        'surface-container':        '#f5edde',
        'surface-container-high':   '#efe7d9',
        'surface-container-highest':'#e9e2d3',

        // On-surfaces — texto sobre fundos
        'on-background':            '#1e1b13',
        'on-surface':               '#1e1b13',
        'on-surface-variant':       '#54433c',
        'inverse-surface':          '#343026',
        'inverse-on-surface':       '#f8f0e1',

        // Outlines — bordas e separadores
        'outline':                  '#87736b',
        'outline-variant':          '#dac1b8',

        // Utilitários
        'surface-tint':             '#944925',
        'error':                    '#ba1a1a',
        'error-container':          '#ffdad6',
        'on-error':                 '#ffffff',
        'on-error-container':       '#93000a',
      },

      // ─── Border radius ─────────────────────────────────────────────────────
      // Estética artesanal: cantos levemente arredondados, não pill/circular.
      borderRadius: {
        DEFAULT: '0.125rem',   // 2px  — botões, inputs
        lg:      '0.25rem',    // 4px  — cards
        xl:      '0.5rem',     // 8px  — modais
        full:    '0.75rem',    // 12px — badges, chips
      },

      // ─── Espaçamentos do sistema ───────────────────────────────────────────
      spacing: {
        'gutter':           '24px',   // gap entre colunas
        'margin-mobile':    '20px',   // padding horizontal mobile
        'margin-desktop':   '64px',   // padding horizontal desktop
        'unit':             '8px',    // unidade base (múltiplos de 8)
        'container-max':    '1280px', // largura máxima do conteúdo
      },

      // ─── Largura máxima ────────────────────────────────────────────────────
      // Necessário para max-w-container funcionar no Tailwind compilado
      maxWidth: {
        'container': '1280px',
      },

      // ─── Família tipográfica ───────────────────────────────────────────────
      // Cada papel tipográfico tem sua fonte mapeada.
      // Instalar via next/font/google no app/layout.tsx.
      fontFamily: {
        'display-lg':        ['var(--font-playfair)', 'Georgia', 'serif'],
        'display-lg-mobile': ['var(--font-playfair)', 'Georgia', 'serif'],
        'headline-sm':       ['var(--font-playfair)', 'Georgia', 'serif'],
        'headline-md':       ['var(--font-playfair)', 'Georgia', 'serif'],
        'label-md':          ['var(--font-work-sans)', 'sans-serif'],
        'body-lg':           ['var(--font-be-vietnam)', 'sans-serif'],
        'body-md':           ['var(--font-be-vietnam)', 'sans-serif'],
        'caption':           ['var(--font-be-vietnam)', 'sans-serif'],
      },

      // ─── Escala tipográfica ────────────────────────────────────────────────
      fontSize: {
        'display-lg': [
          '48px',
          { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-lg-mobile': [
          '36px',
          { lineHeight: '42px', fontWeight: '700' },
        ],
        'headline-md': [
          '32px',
          { lineHeight: '40px', fontWeight: '600' },
        ],
        'headline-sm': [
          '24px',
          { lineHeight: '32px', fontWeight: '600' },
        ],
        'body-lg': [
          '18px',
          { lineHeight: '28px', fontWeight: '400' },
        ],
        'body-md': [
          '16px',
          { lineHeight: '24px', fontWeight: '400' },
        ],
        'label-md': [
          '14px',
          { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '600' },
        ],
        'caption': [
          '12px',
          { lineHeight: '16px', fontWeight: '400' },
        ],
      },
    },
  },

  plugins: [
    require('@tailwindcss/forms'),
    // Se precisar de container-queries no futuro:
    // require('@tailwindcss/container-queries'),
  ],
}

export default config
