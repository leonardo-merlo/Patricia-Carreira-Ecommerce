"use client" // popover com clique-fora e Escape

import { useEffect, useRef } from 'react'

/**
 * Cartão que abre no canto inferior esquerdo, ancorado nos itens do rodapé da
 * barra lateral. Fecha ao clicar fora, ao apertar Escape e ao escolher um item.
 */
export function SidebarPopover({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // mousedown, não click: o clique que abre o popover ainda estaria subindo a
    // árvore e fecharia na mesma hora.
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="sidebar-popover"
      role="dialog"
      aria-labelledby={labelledBy}
      data-testid="sidebar-popover"
    >
      {children}
    </div>
  )
}
