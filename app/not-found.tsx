import Link from 'next/link'
import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p
          className="text-8xl font-bold"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          404
        </p>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Página não encontrada
        </h1>
        <p
          className="text-muted-foreground max-w-sm"
          style={{ fontFamily: 'var(--font-be-vietnam)' }}
        >
          A página que você procura não existe ou foi movida.
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Voltar para a loja</Link>
        </Button>
      </main>
      <Footer />
    </div>
  )
}
