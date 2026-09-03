"use client" // popover com clique-fora, Escape e posição ancorada no botão

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GAP = 8
const EDGE = 12

/**
 * Cartão do rodapé da barra lateral. Duas ancoragens, escolhidas por tela:
 *
 * `anchor="button"` (Configurações) mede o botão real via `labelledBy`, que já é
 * o id dele, e nasce à direita da barra com a base na linha do botão. Antes era
 * canto fixo, e o cartão abria longe do que o chamou.
 *
 * `anchor="corner"` (Notificações) fica no canto inferior esquerdo. A lista é
 * longa e tem abas: encostada no canto ela tem altura inteira e não fica
 * pendurada no meio da tela.
 *
 * Fecha ao clicar fora, ao apertar Escape e ao escolher um item.
 */
export function SidebarPopover({
  open,
  onClose,
  labelledBy,
  anchor = 'button',
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  anchor?: 'button' | 'corner'
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
    if (!open || anchor === 'corner') {
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
  }, [open, labelledBy, anchor])

  // O `document` não existe na renderização do servidor. Na prática `open`
  // sempre começa falso e a guarda acima já bastaria, mas o portal não pode
  // depender disso continuar verdade.
  if (!open || typeof document === 'undefined') return null

  const card = (
    <div
      ref={ref}
      className="sidebar-popover"
      role="dialog"
      aria-labelledby={labelledBy}
      data-testid="sidebar-popover"
      style={
        anchor === 'corner'
          ? { left: EDGE, bottom: EDGE }
          : pos
            ? { left: pos.left, bottom: pos.bottom }
            : // Primeiro quadro, antes da medição: existe para ter tamanho, mas
              // não pisca no lugar errado.
              { left: 0, bottom: 0, visibility: 'hidden' }
      }
    >
      {children}
    </div>
  )

  // Portal para o `.admin-root`, e não para o lugar onde o componente é chamado.
  //
  // Por que sair do lugar: `.sidebar` é `position: sticky`, e sticky cria um
  // contexto de empilhamento SEMPRE, com ou sem z-index. Dentro dele, o
  // `z-index: 60` do cartão só valia contra os irmãos da própria barra; a barra
  // inteira entrava na página com z-index automático, então qualquer conteúdo
  // desenhado depois passava por cima. Era o card de "Vencidas" do dashboard
  // cobrindo as notificações.
  //
  // Por que `.admin-root` e não o `body`: todo o CSS do painel é escopado em
  // `.admin-root .alguma-coisa`. No body o cartão sai desse escopo e perde o
  // estilo inteiro de uma vez, virando texto solto no fim da página. Já
  // `.admin-root` é só `display: grid`, sem position, transform ou filter, então
  // não cria contexto de empilhamento: serve de destino sem recriar o problema.
  const host =
    document.getElementById(labelledBy)?.closest('.admin-root') ??
    document.querySelector('.admin-root') ??
    document.body

  return createPortal(card, host)
}
