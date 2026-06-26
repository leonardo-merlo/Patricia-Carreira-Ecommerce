"use client" // requires useState, useEffect, and localStorage access

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "cookie_consent"

export function CookieConsent() {
  const [consent, setConsent] = useState<string | null>(null)

  useEffect(() => {
    setConsent(localStorage.getItem(STORAGE_KEY))
  }, [])

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "accepted")
    setConsent("accepted")
  }

  function handleRefuse() {
    localStorage.setItem(STORAGE_KEY, "refused")
    setConsent("refused")
  }

  if (consent !== null) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-surface-container px-[var(--spacing-margin-mobile)] py-4 md:px-[var(--spacing-margin-desktop)]">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Usamos cookies essenciais para o funcionamento do site. Ao continuar navegando, você concorda com nossa{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-on-surface">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={handleRefuse}>
            Recusar
          </Button>
          <Button variant="default" size="sm" onClick={handleAccept}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  )
}
