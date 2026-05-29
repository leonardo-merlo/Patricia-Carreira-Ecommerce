"use client" // needs state for optimistic toggle and login redirect

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toggleWishlist } from "@/lib/actions/wishlist"

interface WishlistButtonProps {
  productId: string
  initialIsFavorited: boolean
  isLoggedIn: boolean
}

export function WishlistButton({
  productId,
  initialIsFavorited,
  isLoggedIn,
}: WishlistButtonProps) {
  const router = useRouter()
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/conta/entrar?redirect=/conta/favoritos")
      return
    }

    const optimistic = !isFavorited
    setIsFavorited(optimistic)

    startTransition(async () => {
      const result = await toggleWishlist(productId)
      if (!result.ok) {
        setIsFavorited(!optimistic)
      } else {
        setIsFavorited(result.isFavorited)
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="lg"
      className="px-4"
      aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      onClick={handleClick}
      disabled={isPending}
      id="btn-favorito"
      data-testid="wishlist-button"
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-colors",
          isFavorited ? "fill-primary text-primary" : "text-on-surface-variant",
        )}
      />
    </Button>
  )
}
