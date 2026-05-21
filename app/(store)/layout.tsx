import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { CartProvider } from '@/lib/cart-context'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  )
}
