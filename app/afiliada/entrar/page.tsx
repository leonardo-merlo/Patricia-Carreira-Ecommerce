"use client"

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot' | 'sent'

const FOCUS_BORDER = 'var(--pc-clay)'
const IDLE_BORDER = '#e2d4c4'

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: 8,
  border: `1.5px solid ${IDLE_BORDER}`,
  fontSize: 15,
  color: 'var(--pc-ink)',
  background: 'var(--pc-parchment)',
  outline: 'none',
  transition: 'border-color 0.15s',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--pc-brown)',
  letterSpacing: '0.3px',
}

const btnPrimaryStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '13px 24px',
  borderRadius: 8,
  background: 'var(--pc-terracotta)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  width: '100%',
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--pc-brown-mute)',
  padding: '6px 0',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}

const errorStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--pc-red)',
  margin: 0,
  padding: '10px 14px',
  background: 'var(--pc-red-soft)',
  borderRadius: 8,
  border: '1px solid #f0c4bf',
}

export default function AfiliadaEntrarPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('E-mail ou senha inválidos.')
      setLoading(false)
      return
    }
    router.push('/afiliada')
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/afiliada/trocar-senha`,
    })
    if (resetError) {
      setError('Não foi possível enviar o link. Verifique o e-mail e tente novamente.')
      setLoading(false)
      return
    }
    setMode('sent')
    setLoading(false)
  }

  const switchToForgot = () => {
    setForgotEmail(email)
    setError(null)
    setMode('forgot')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--pc-sand)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'var(--font-be-vietnam), system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '40px 32px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 24px rgba(var(--pc-shadow-rgb), 0.10)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Image
            src="/images/logo/logo-v2.png"
            alt=""
            width={56}
            height={56}
            aria-hidden="true"
            style={{ display: 'block', margin: '0 auto 12px', height: 56, width: 'auto' }}
            priority
          />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--pc-ink)',
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            Patrícia Carreira
          </h1>
          <p style={{ fontSize: 13, color: 'var(--pc-brown-mute)', marginTop: 6, marginBottom: 0 }}>
            {mode === 'login'
              ? 'Área da Afiliada'
              : mode === 'forgot'
              ? 'Recuperar acesso'
              : 'E-mail enviado'}
          </p>
        </div>

        {/* ── Login ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="email" style={labelStyle}>E-MAIL</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = FOCUS_BORDER }}
                onBlur={e => { e.currentTarget.style.borderColor = IDLE_BORDER }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="password" style={labelStyle}>SENHA</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = FOCUS_BORDER }}
                onBlur={e => { e.currentTarget.style.borderColor = IDLE_BORDER }}
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ ...btnPrimaryStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={switchToForgot}
              style={linkBtnStyle}
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {/* ── Esqueci a senha ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--pc-brown)', margin: 0, lineHeight: 1.6 }}>
              Informe o seu e-mail de afiliada. Vamos enviar um link para você definir uma nova senha.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="forgot-email" style={labelStyle}>E-MAIL</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = FOCUS_BORDER }}
                onBlur={e => { e.currentTarget.style.borderColor = IDLE_BORDER }}
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ ...btnPrimaryStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Enviando…' : 'Enviar link'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              style={linkBtnStyle}
            >
              Voltar ao login
            </button>
          </form>
        )}

        {/* ── E-mail enviado ── */}
        {mode === 'sent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--pc-olive-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: 22,
              }}
            >
              ✓
            </div>
            <p style={{ fontSize: 14, color: 'var(--pc-ink)', margin: 0, fontWeight: 600 }}>
              Link enviado!
            </p>
            <p style={{ fontSize: 13, color: 'var(--pc-brown)', margin: 0, lineHeight: 1.6 }}>
              Verifique a caixa de entrada de <strong>{forgotEmail}</strong> e clique no link para definir sua nova senha.
            </p>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              style={linkBtnStyle}
            >
              Voltar ao login
            </button>
          </div>
        )}

        {mode === 'login' && (
          <p
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--pc-brown-mute)',
              marginTop: 28,
              marginBottom: 0,
            }}
          >
            Acesso exclusivo para afiliadas convidadas.
          </p>
        )}
      </div>
    </div>
  )
}
