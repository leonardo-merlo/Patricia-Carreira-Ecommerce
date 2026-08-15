"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  usePasswordReveal,
  PasswordRevealButton,
  PasswordStrength,
} from '@/components/ui/password-field'
import { PASSWORD_MIN_LENGTH, passwordError } from '@/lib/password'

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #e2d4c4',
  fontSize: 14,
  color: 'var(--pc-ink)',
  background: 'var(--pc-parchment)',
  outline: 'none',
  transition: 'border-color 0.15s',
  width: '100%',
  boxSizing: 'border-box',
}

export default function TrocarSenhaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const reveal = usePasswordReveal()
  const revealConfirm = usePasswordReveal()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const weak = passwordError(password)
    if (weak) { setError(weak); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError('Erro ao atualizar senha. O link pode ter expirado — solicite um novo.')
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/afiliada'), 2000)
  }

  const wrapper: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--pc-sand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: 'var(--font-be-vietnam), system-ui, -apple-system, sans-serif',
  }

  const card: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 16,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  }

  const header = (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--pc-ink)', margin: 0, letterSpacing: '-0.3px' }}>
        Patrícia Carreira
      </h1>
    </div>
  )

  if (done) {
    return (
      <div style={wrapper}>
        <div style={card}>
          {header}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--pc-olive-soft)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 22,
            }}>✓</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pc-ink)', margin: '0 0 8px' }}>
              Senha atualizada!
            </p>
            <p style={{ fontSize: 13, color: 'var(--pc-brown-mute)', margin: 0 }}>
              Redirecionando para o painel…
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={wrapper}>
        <div style={card}>
          {header}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--pc-brown-mute)', margin: '0 0 16px' }}>
              Verificando o link de recuperação…
            </p>
            <p style={{ fontSize: 12, color: 'var(--pc-brown-mute)', margin: 0 }}>
              Chegou aqui por engano?{' '}
              <a href="/afiliada/entrar" style={{ color: 'var(--pc-brown)' }}>Voltar ao login</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapper}>
      <div style={card}>
        {header}
        <p style={{ fontSize: 13, color: 'var(--pc-brown)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Defina sua nova senha de acesso ao painel de afiliada.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="password" style={{ fontSize: 12, fontWeight: 600, color: 'var(--pc-brown)', letterSpacing: '0.3px' }}>
              NOVA SENHA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={reveal.inputType}
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 38 }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--pc-clay)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2d4c4' }}
              />
              <PasswordRevealButton {...reveal} />
            </div>
            <PasswordStrength password={password} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="confirm" style={{ fontSize: 12, fontWeight: 600, color: 'var(--pc-brown)', letterSpacing: '0.3px' }}>
              CONFIRMAR SENHA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm"
                type={revealConfirm.inputType}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={{ ...inputStyle, paddingRight: 38 }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--pc-clay)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2d4c4' }}
              />
              <PasswordRevealButton {...revealConfirm} />
            </div>
          </div>

          {error && (
            <p style={{
              fontSize: 13, color: 'var(--pc-red)', margin: 0,
              padding: '10px 14px', background: 'var(--pc-red-soft)',
              borderRadius: 8, border: '1px solid #f5c6c2',
            }}>
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
              background: 'var(--pc-terracotta)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              width: '100%',
            }}
          >
            {loading ? 'Salvando…' : 'Definir nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
