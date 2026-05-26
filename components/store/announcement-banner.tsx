"use client" // text rotation requires useState + useEffect

import { useState, useEffect } from "react"
import Link from "next/link"

type Message = {
  content: React.ReactNode
  cta?: { label: string; href: string }
}

const WHATSAPP_HREF = "https://wa.me/5522988223993?text=Quero%20saber%20sobre%20envios%20internacionais."

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const MESSAGES: Message[] = [
  {
    content: "Ganhe frete grátis nas compras acima de R$ 599,00",
  },
  {
    content: "Compre no site e retire na loja",
  },
  {
    content: "Parcelamento em até 5x sem juros. Aproveite!",
  },
  {
    content: (
      <>
        Ganhe 10% OFF na sua primeira compra usando o cupom:{" "}
        <strong className="font-semibold tracking-wide">BEMVINDA10</strong>
      </>
    ),
  },
  {
    content: "5% OFF pagamento via PIX",
  },
  {
    content: (
      <>
        Envios internacionais —{" "}
        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
        >
          <WhatsAppIcon /> Falar pelo WhatsApp
        </a>
      </>
    ),
  },
]

const INTERVAL_MS = 4000

export function AnnouncementBanner() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % MESSAGES.length)
        setVisible(true)
      }, 300)
    }, INTERVAL_MS)

    return () => clearInterval(timer)
  }, [])

  const message = MESSAGES[index]

  return (
    <div className="w-full bg-[#6B6B2A] py-3 text-center font-caption text-on-secondary text-sm">
      <span className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        {message.content}
        {message.cta && (
          <>
            {" — "}
            <Link
              href={message.cta.href}
              className="font-medium underline underline-offset-2 hover:opacity-80"
            >
              {message.cta.label}
            </Link>
          </>
        )}
      </span>
    </div>
  )
}
