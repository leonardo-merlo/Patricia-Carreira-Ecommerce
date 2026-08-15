import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { CartProvider } from '@/lib/cart-context'
import { AnnouncementBanner } from '@/components/store/announcement-banner'
import { WhatsAppButton } from '@/components/store/whatsapp-button'
import { ClientOnlyShell } from '@/components/store/client-only-shell'
import { CartToast } from '@/components/store/cart-toast'
import { CookieConsent } from '@/components/store/cookie-consent'
import { getActiveAnnouncements } from '@/lib/supabase/announcements'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const announcements = await getActiveAnnouncements()

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
        <AnnouncementBanner messages={announcements.map((a) => a.content)} />
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
