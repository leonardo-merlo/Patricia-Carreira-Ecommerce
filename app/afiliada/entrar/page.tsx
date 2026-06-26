"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot' | 'sent'

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #e2d4c4',
  fontSize: 14,
  color: '#1a1208',
  background: '#fdfaf7',
  outline: 'none',
  transition: 'border-color 0.15s',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#5c4a32',
  letterSpacing: '0.3px',
}

const btnPrimaryStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '12px 24px',
  borderRadius: 8,
  background: '#1a1208',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  width: '100%',
}

const errorStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#c0392b',
  margin: 0,
  padding: '10px 14px',
  background: '#fff0ee',
  borderRadius: 8,
  border: '1px solid #f5c6c2',
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
        background: '#f5ede0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#1a1208',
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            Patrícia Carreira
          </h1>
          <p style={{ fontSize: 13, color: '#8a7560', marginTop: 6, marginBottom: 0 }}>
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
                onFocus={e => { e.currentTarget.style.borderColor = '#c4a882' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2d4c4' }}
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
                onFocus={e => { e.currentTarget.style.borderColor = '#c4a882' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2d4c4' }}
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
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: '#8a7560',
                padding: '4px 0',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {/* ── Esqueci a senha ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#5c4a32', margin: 0, lineHeight: 1.6 }}>
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
                onFocus={e => { e.currentTarget.style.borderColor = '#c4a882' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2d4c4' }}
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
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: '#8a7560',
                padding: '4px 0',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
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
                background: '#f0f7ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: 22,
              }}
            >
              ✓
            </div>
            <p style={{ fontSize: 14, color: '#1a1208', margin: 0, fontWeight: 600 }}>
              Link enviado!
            </p>
            <p style={{ fontSize: 13, color: '#5c4a32', margin: 0, lineHeight: 1.6 }}>
              Verifique a caixa de entrada de <strong>{forgotEmail}</strong> e clique no link para definir sua nova senha.
            </p>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: '#8a7560',
                padding: '4px 0',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
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
              color: '#b09e8a',
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
