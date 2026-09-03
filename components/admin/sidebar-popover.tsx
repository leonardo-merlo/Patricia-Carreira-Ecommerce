"use client" // popover com clique-fora, Escape e posição ancorada no botão

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const GAP = 8
const EDGE = 12

/**
 * Cartão ancorado ao item que o abriu: nasce à direita da barra lateral, com a
 * base na mesma linha do botão, e cresce para cima.
 *
 * A posição é medida do botão real (via `labelledBy`, que já é o id dele) em vez
 * de fixada no canto da tela. Antes era `left: 12px; bottom: 12px`, então o
 * cartão de Configurações abria no rodapé esquerdo, longe do botão, e tapava
 * Diagnóstico e Notificações.
 *
 * Fecha ao clicar fora, ao apertar Escape e ao escolher um item.
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
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // mousedown, não click: o clique que abre o popover ainda estaria subindo a
    // árvore e fecharia na mesma hora.
    const onDown = (e: MouseEvent) => {
      const anchor = document.getElementById(labelledBy)
      const target = e.target as Node
      if (anchor?.contains(target)) return
      if (ref.current && !ref.current.contains(target)) onClose()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, onClose, labelledBy])

  // Layout effect para a medição acontecer antes da pintura: com useEffect o
  // cartão aparecia um quadro no canto errado e pulava para o lugar.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }

    const place = () => {
      const anchor = document.getElementById(labelledBy)
      const card = ref.current
      if (!anchor || !card) return

      const rect = anchor.getBoundingClientRect()
      const width = card.offsetWidth
      const height = card.offsetHeight

      // À direita da barra. Se não couber (celular, tela estreita), encosta na
      // borda direita da janela em vez de sumir fora dela.
      let left = rect.right + GAP
      if (left + width > window.innerWidth - EDGE) {
        left = Math.max(EDGE, window.innerWidth - width - EDGE)
      }

      // Base alinhada com a base do botão, crescendo para cima. Se o cartão for
      // mais alto que o espaço acima, desce até encostar no topo da janela.
      let bottom = window.innerHeight - rect.bottom
      if (bottom + height > window.innerHeight - EDGE) {
        bottom = Math.max(EDGE, window.innerHeight - height - EDGE)
      }

      setPos({ left, bottom })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, labelledBy])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="sidebar-popover"
      role="dialog"
      aria-labelledby={labelledBy}
      data-testid="sidebar-popover"
      style={
        pos
          ? { left: pos.left, bottom: pos.bottom }
          : // Primeiro quadro, antes da medição: existe para ter tamanho, mas
            // não pisca no lugar errado.
            { left: 0, bottom: 0, visibility: 'hidden' }
      }
    >
      {children}
    </div>
  )
}
