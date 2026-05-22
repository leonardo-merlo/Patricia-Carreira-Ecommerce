import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoString))
}

const COLOR_MAP: Record<string, string> = {
  "Azul Turquesa": "#00CED1",
  "Cáqui":         "#C3B091",
  "Laranja":       "#E8752A",
  "Marinho":       "#1B2A4A",
  "Mostarda":      "#D4A017",
  "Verde Musgo":   "#5D6B35",
  "Vermelha":      "#C0392B",
  "Vermelho":      "#C0392B",
  "Vinho":         "#722F37",
  "Natural":       "#E8DCC8",
}

export function getColorHex(name: string): string {
  return COLOR_MAP[name] ?? "#9CA3AF"
}

export function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5
}
