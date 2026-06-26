import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { CartProvider } from '@/lib/cart-context'
import { AnnouncementBanner } from '@/components/store/announcement-banner'
import { WhatsAppButton } from '@/components/store/whatsapp-button'
import { ClientOnlyShell } from '@/components/store/client-only-shell'
import { CartToast } from '@/components/store/cart-toast'
import { CookieConsent } from '@/components/store/cookie-consent'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
        <AnnouncementBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
        <ClientOnlyShell />
        <CartToast />
        <CookieConsent />
      </div>
    </CartProvider>
  )
}
