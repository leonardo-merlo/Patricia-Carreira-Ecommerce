import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Em construção — Patrícia Carreira',
  robots: { index: false, follow: false },
}

export default function EmConstrucaoPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        backgroundColor: 'var(--pc-cream)',
        color: 'var(--pc-ink)',
      }}
    >
      <Image
        src="/images/logo/logo-v2.png"
        alt="Patrícia Carreira"
        width={120}
        height={120}
        style={{ height: 'auto', width: '96px' }}
        priority
      />
      <h1
        style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 500,
          margin: 0,
        }}
      >
        Site em construção
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-be-vietnam)',
          fontSize: '1.05rem',
          color: 'var(--pc-brown-mute)',
          maxWidth: '32rem',
          margin: 0,
        }}
      >
        Estamos preparando a loja online da Patrícia Carreira. Em breve você poderá
        conferir toda a coleção por aqui — por enquanto, fale com a gente pelo
        WhatsApp ou Instagram.
      </p>
    </main>
  )
}
