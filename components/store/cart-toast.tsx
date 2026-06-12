"use client" // reads lastAdded from cart context and auto-dismisses with a timer

import { useEffect, useRef } from "react"
import Image from "next/image"
import { X, ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-context"

export function CartToast() {
  const { lastAdded, clearLastAdded } = useCart()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!lastAdded) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      clearLastAdded()
    }, 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [lastAdded, clearLastAdded])

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed top-20 right-4 z-50 w-72 rounded-xl border border-outline-variant bg-surface shadow-lg",
        "transition-all duration-300 ease-out",
        lastAdded
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {lastAdded && (
        <div className="flex items-start gap-3 p-3">
          {/* Thumbnail */}
          <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-surface-container-high">
            {lastAdded.image ? (
              <Image
                src={lastAdded.image}
                alt={lastAdded.productName}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-on-surface-variant opacity-40" />
              </div>
            )}
          </div>

          {/* Text */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="font-caption text-caption text-on-surface-variant">
              Adicionado ao carrinho
            </p>
            <p className="line-clamp-1 font-label-md text-label-md text-on-surface">
              {lastAdded.productName}
            </p>
            <p className="font-caption text-caption text-on-surface-variant">
              {lastAdded.variantLabel}
            </p>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={clearLastAdded}
            aria-label="Fechar notificação"
            className="mt-0.5 flex-shrink-0 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
