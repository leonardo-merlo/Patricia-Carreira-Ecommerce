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
    title: 'Patrícia Carreira',
    description: "Moda artesanal brasileira — bolsas, vestidos e batas feitos à mão. Presentes em Arraial d'Ajuda, BA e em todo o Brasil.",
    url: 'https://patriciacarreira.com.br',
    siteName: 'Patrícia Carreira',
    locale: 'pt_BR',
    type: 'website',
    images: ['/images/refs2/hero-oficial.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/refs2/hero-oficial.png'],
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
