"use client" // text rotation requires useState + useEffect

import { useState, useEffect } from "react"
import Link from "next/link"

type Message = {
  content: React.ReactNode
  cta?: { label: string; href: string }
}

const MESSAGES: Message[] = [
  {
    content: "Se cadastre e ganhe 15% de desconto",
    cta: { label: "Criar conta grátis", href: "/conta/cadastrar" },
  },
  {
    content: (
      <>
        Compras acima de R$ 700 têm{" "}
        <strong className="font-semibold uppercase tracking-wide">frete grátis</strong>
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
    <div className="w-full bg-[#1a47a8] py-1.5 text-center font-caption text-caption text-on-secondary">
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
