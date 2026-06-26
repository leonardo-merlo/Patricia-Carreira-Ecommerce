"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AfiliadaEntrarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
          <p
            style={{
              fontSize: 13,
              color: '#8a7560',
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Área da Afiliada
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="email"
              style={{ fontSize: 12, fontWeight: 600, color: '#5c4a32', letterSpacing: '0.3px' }}
            >
              E-MAIL
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1.5px solid #e2d4c4',
                fontSize: 14,
                color: '#1a1208',
                background: '#fdfaf7',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#c4a882' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2d4c4' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="password"
              style={{ fontSize: 12, fontWeight: 600, color: '#5c4a32', letterSpacing: '0.3px' }}
            >
              SENHA
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1.5px solid #e2d4c4',
                fontSize: 14,
                color: '#1a1208',
                background: '#fdfaf7',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#c4a882' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2d4c4' }}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: 13,
                color: '#c0392b',
                margin: 0,
                padding: '10px 14px',
                background: '#fff0ee',
                borderRadius: 8,
                border: '1px solid #f5c6c2',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px 24px',
              borderRadius: 8,
              background: loading ? '#5c4a32' : '#1a1208',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s, opacity 0.15s',
              width: '100%',
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

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
      </div>
    </div>
  )
}
