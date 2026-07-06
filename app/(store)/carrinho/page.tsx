"use client" // cart state via useCart()

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingBag, Trash2, Plus, Minus, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/utils"
import { validateCoupon } from "@/lib/actions/coupons"
import { getFreeShippingThreshold } from "@/lib/actions/shipping"

const PLACEHOLDER = "/images/placeholder-product.svg"

export default function CarrinhoPage() {
  const { cart, hydrated, removeItem, updateQuantity, applyCoupon, removeCoupon } = useCart()
  const [couponInput, setCouponInput] = useState("")
  const [couponError, setCouponError] = useState("")
  const [couponPending, startCouponTransition] = useTransition()
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  // Valor configurado no admin (store_settings); 599 é só o estado inicial
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(599)

  useEffect(() => {
    getFreeShippingThreshold().then(setFreeShippingThreshold).catch(() => {})
  }, [])

  if (!hydrated) return null

  function handleCoupon() {
    if (!couponInput.trim()) return
    startCouponTransition(async () => {
      const { coupon, error } = await validateCoupon(couponInput.trim(), cart.subtotal)
      if (error) {
        setCouponError(error)
        return
      }
      if (coupon) {
        applyCoupon(coupon)
        setCouponInput("")
        setCouponError("")
      }
    })
  }

  const isEmpty = cart.items.length === 0

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-12 md:px-margin-desktop">
      <h1 className="font-headline-md text-headline-md text-on-surface">Meu Carrinho</h1>

      <Separator className="my-8" />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-on-surface-variant opacity-30" />
          <p className="mt-4 font-headline-sm text-headline-sm text-on-surface-variant">
            Seu carrinho está vazio
          </p>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Explore a coleção e adicione suas peças favoritas.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/bolsas">Ver Bolsas</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/vestidos">Ver Roupas</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* Lista de itens */}
          <div className="flex flex-col gap-6">
            {cart.items.map((item) => {
              const imgSrc = item.variant.product.images[0] ?? null
              const hasError = imageErrors[item.variant.id]
              const variantLabel = [item.variant.size, item.variant.color]
                .filter(Boolean)
                .join(" · ")

              return (
                <div key={item.variant.id} className="flex gap-4">
                  {/* Imagem */}
                  <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
                    {imgSrc && !hasError ? (
                      <Image
                        src={imgSrc}
                        alt={item.variant.product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [item.variant.id]: true }))
                        }
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={PLACEHOLDER}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </div>

                  {/* Detalhes */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/produto/${item.variant.product.slug}`}
                          className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors"
                        >
                          {item.variant.product.name}
                        </Link>
                        {variantLabel && (
                          <p className="mt-0.5 font-caption text-caption text-on-surface-variant">
                            {variantLabel}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.variant.id)}
                        aria-label="Remover item"
                        className="text-on-surface-variant hover:text-error transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantidade */}
                      <div className="flex items-center gap-1 rounded border border-outline-variant">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                          aria-label="Diminuir quantidade"
                          className="flex h-8 w-8 items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[20px] text-center font-label-md text-label-md text-on-surface">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                          disabled={item.quantity >= item.variant.stock_quantity}
                          aria-label="Aumentar quantidade"
                          className="flex h-8 w-8 items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="font-label-md text-label-md text-on-surface">
                        {formatPrice(item.variant.product.base_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumo do pedido */}
          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-6 self-start">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Resumo do Pedido
            </h2>

            <Separator />

            <div className="flex flex-col gap-3 font-body-md text-body-md">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal ({cart.item_count} {cart.item_count === 1 ? "item" : "itens"})</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>

              {cart.discount_amount > 0 && (
                <div className="flex justify-between text-tertiary">
                  <span className="flex items-center gap-1">
                    Desconto
                    {cart.coupon && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {cart.coupon.code}
                      </Badge>
                    )}
                  </span>
                  <span>− {formatPrice(cart.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-on-surface-variant">
                <span>Frete</span>
                <span className="text-on-surface-variant italic">
                  {cart.shipping_amount > 0 ? formatPrice(cart.shipping_amount) : "Calculado no checkout"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface">
              <span>Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>

            {/* Cupom */}
            {cart.coupon ? (
              <div className="flex items-center justify-between rounded-lg bg-surface-container px-3 py-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-tertiary" />
                  <span className="font-label-md text-label-md text-on-surface">{cart.coupon.code}</span>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  aria-label="Remover cupom"
                  className="text-on-surface-variant hover:text-error transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Código do cupom"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase())
                      setCouponError("")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCoupon()
                    }}
                    className="flex-1"
                    id="input-cupom"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCoupon}
                    disabled={!couponInput.trim() || couponPending}
                    id="btn-aplicar-cupom"
                  >
                    {couponPending ? "..." : "Aplicar"}
                  </Button>
                </div>
                {couponError && (
                  <p className="font-caption text-caption text-error">{couponError}</p>
                )}
              </div>
            )}

            {/* Frete grátis */}
            {cart.subtotal >= freeShippingThreshold ? (
              <div className="flex flex-col gap-1.5 rounded-lg bg-tertiary/10 px-3 py-2.5">
                <p className="font-label-md text-label-md text-tertiary">
                  🎉 Frete grátis conquistado!
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-tertiary/20">
                  <div className="h-full w-full rounded-full bg-tertiary" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-lg bg-surface-container px-3 py-2.5">
                <p className="font-caption text-caption text-on-surface-variant">
                  Faltam{" "}
                  <span className="font-label-md text-label-md text-on-surface">
                    {formatPrice(freeShippingThreshold - cart.subtotal)}
                  </span>{" "}
                  para frete grátis
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min((cart.subtotal / freeShippingThreshold) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <Button size="lg" className="w-full" asChild id="btn-ir-checkout">
              <Link href="/checkout">Finalizar Compra</Link>
            </Button>

            <Link
              href="/"
              className="text-center font-caption text-caption text-on-surface-variant hover:text-on-surface transition-colors underline"
            >
              Continuar comprando
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
