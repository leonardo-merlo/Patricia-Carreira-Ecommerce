import type { Metadata } from 'next'
import { Playfair_Display, Be_Vietnam_Pro, Work_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-be-vietnam',
  display: 'swap',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-work-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Patrícia Carreira',
  description: "Moda artesanal brasileira — bolsas, vestidos e batas feitos à mão. Presentes em Arraial d'Ajuda, BA e em todo o Brasil.",
  openGraph: {
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${beVietnam.variable} ${workSans.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
