import type { Metadata } from 'next'
import { Fraunces, Mulish } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
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
      className={`${fraunces.variable} ${mulish.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
