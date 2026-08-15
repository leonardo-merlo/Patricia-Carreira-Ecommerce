"use client" // estado de revelação e força vivem no navegador

import { useState } from 'react'
import { PASSWORD_REQUIREMENTS, checkPassword, type PasswordStrengthLevel } from '@/lib/password'

// Peças soltas em vez de um componente fechado: a loja usa os tokens do design
// system e o portal da afiliada usa estilo inline com as variáveis --pc-*.
// Um componente único teria que agradar os dois e não agradaria nenhum.

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {open ? (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M2 12s3.5-7 10-7c2 0 3.7.65 5.1 1.6M22 12s-3.5 7-10 7c-2 0-3.7-.65-5.1-1.6" />
        <path d="m4 4 16 16" />
      </>
    )}
  </svg>
)

/**
 * Revela a senha só enquanto o botão está pressionado — mouse, toque ou teclado.
 * Soltar, sair com o mouse ou perder o foco esconde de novo: uma senha visível
 * esquecida na tela é pior do que não ter o recurso.
 */
export function usePasswordReveal() {
  const [revealed, setRevealed] = useState(false)

  const show = () => setRevealed(true)
  const hide = () => setRevealed(false)

  return {
    revealed,
    inputType: revealed ? ('text' as const) : ('password' as const),
    buttonProps: {
      type: 'button' as const,
      tabIndex: 0,
      'aria-label': revealed ? 'Ocultar senha' : 'Mostrar senha enquanto pressiona',
      'aria-pressed': revealed,
      onMouseDown: show,
      onMouseUp: hide,
      onMouseLeave: hide,
      onTouchStart: show,
      onTouchEnd: hide,
      onTouchCancel: hide,
      onBlur: hide,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); show() }
      },
      onKeyUp: (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hide() }
      },
    },
  }
}

type PasswordReveal = ReturnType<typeof usePasswordReveal>

/** Botão do olho, posicionado dentro do campo. Use com `{...reveal}`. */
export function PasswordRevealButton({
  revealed,
  buttonProps,
}: Pick<PasswordReveal, 'revealed' | 'buttonProps'>) {
  return (
    <button
      {...buttonProps}
      data-testid="btn-mostrar-senha"
      style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        padding: 4,
        cursor: 'pointer',
        color: 'currentColor',
        opacity: revealed ? 0.9 : 0.55,
      }}
    >
      <EyeIcon open={revealed} />
    </button>
  )
}

const LEVEL_COLOR: Record<PasswordStrengthLevel, string> = {
  'muito-fraca': '#c0392b',
  'fraca': '#d98324',
  'boa': '#7a8b3a',
  'forte': '#4a7c3f',
}

/**
 * Medidor de força com a lista de requisitos. Aparece só depois que a pessoa
 * começa a digitar — mostrar cinco itens vermelhos num campo vazio é ruído.
 */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const check = checkPassword(password)
  const color = LEVEL_COLOR[check.level]
  const pct = (check.score / PASSWORD_REQUIREMENTS.length) * 100

  return (
    <div style={{ marginTop: 8 }} data-testid="medidor-forca-senha">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.10)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: color,
              borderRadius: 2,
              transition: 'width 160ms ease, background 160ms ease',
            }}
          />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
          {check.levelLabel}
        </span>
      </div>

      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 3 }}>
        {PASSWORD_REQUIREMENTS.map((req) => {
          const ok = check.met.includes(req.id)
          return (
            <li
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: ok ? LEVEL_COLOR.forte : 'rgba(0,0,0,0.5)',
              }}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, width: 10, display: 'inline-block' }}>
                {ok ? '✓' : '·'}
              </span>
              {req.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
