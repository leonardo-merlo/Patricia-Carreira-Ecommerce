"use client" // React context requires client boundary

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react"
import type { Cart, CartItem, Product, ProductVariant, Coupon } from "@/lib/types"

// ─── Actions ─────────────────────────────────────────────────────────────────

type CartAction =
  | { type: "ADD_ITEM"; variant: ProductVariant & { product: Product }; quantity: number }
  | { type: "REMOVE_ITEM"; variantId: string }
  | { type: "UPDATE_QUANTITY"; variantId: string; quantity: number }
  | { type: "APPLY_COUPON"; coupon: Coupon }
  | { type: "REMOVE_COUPON" }
  | { type: "SET_SHIPPING"; amount: number }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: Cart }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_CART: Cart = {
  items: [],
  subtotal: 0,
  discount_amount: 0,
  shipping_amount: 0,
  total: 0,
  item_count: 0,
  coupon: null,
}

function totals(
  items: CartItem[],
  coupon: Coupon | null,
  shipping: number
): Pick<Cart, "subtotal" | "discount_amount" | "shipping_amount" | "total" | "item_count"> {
  const subtotal = items.reduce(
    (sum, i) => sum + i.variant.product.base_price * i.quantity,
    0
  )
  const item_count = items.reduce((sum, i) => sum + i.quantity, 0)

  let discount_amount = 0
  if (coupon) {
    discount_amount =
      coupon.type === "percent"
        ? subtotal * (coupon.value / 100)
        : Math.min(coupon.value, subtotal)
  }

  const total = Math.max(0, subtotal - discount_amount + shipping)
  return { subtotal, discount_amount, shipping_amount: shipping, total, item_count }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.variant.id === action.variant.id)
      const newItems: CartItem[] = existing
        ? state.items.map((i) =>
            i.variant.id === action.variant.id
              ? { ...i, quantity: i.quantity + action.quantity }
              : i
          )
        : [...state.items, { variant: action.variant, quantity: action.quantity }]
      return { ...state, items: newItems, ...totals(newItems, state.coupon, state.shipping_amount) }
    }

    case "REMOVE_ITEM": {
      const newItems = state.items.filter((i) => i.variant.id !== action.variantId)
      return { ...state, items: newItems, ...totals(newItems, state.coupon, state.shipping_amount) }
    }

    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        const newItems = state.items.filter((i) => i.variant.id !== action.variantId)
        return { ...state, items: newItems, ...totals(newItems, state.coupon, state.shipping_amount) }
      }
      const newItems = state.items.map((i) =>
        i.variant.id === action.variantId ? { ...i, quantity: action.quantity } : i
      )
      return { ...state, items: newItems, ...totals(newItems, state.coupon, state.shipping_amount) }
    }

    case "APPLY_COUPON":
      return {
        ...state,
        coupon: action.coupon,
        ...totals(state.items, action.coupon, state.shipping_amount),
      }

    case "REMOVE_COUPON":
      return {
        ...state,
        coupon: null,
        ...totals(state.items, null, state.shipping_amount),
      }

    case "SET_SHIPPING":
      return { ...state, ...totals(state.items, state.coupon, action.amount) }

    case "CLEAR_CART":
      return EMPTY_CART

    case "HYDRATE":
      return action.payload

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CartContextValue {
  cart: Cart
  hydrated: boolean
  addItem: (variant: ProductVariant & { product: Product }, quantity?: number) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  applyCoupon: (coupon: Coupon) => void
  removeCoupon: () => void
  setShipping: (amount: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = "patricia-carreira-cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) dispatch({ type: "HYDRATE", payload: JSON.parse(stored) })
    } catch {
      // invalid stored data — start fresh
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart, hydrated])

  const value: CartContextValue = {
    cart,
    hydrated,
    addItem: (variant, quantity = 1) =>
      dispatch({ type: "ADD_ITEM", variant, quantity }),
    removeItem: (variantId) => dispatch({ type: "REMOVE_ITEM", variantId }),
    updateQuantity: (variantId, quantity) =>
      dispatch({ type: "UPDATE_QUANTITY", variantId, quantity }),
    applyCoupon: (coupon) => dispatch({ type: "APPLY_COUPON", coupon }),
    removeCoupon: () => dispatch({ type: "REMOVE_COUPON" }),
    setShipping: (amount) => dispatch({ type: "SET_SHIPPING", amount }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}
