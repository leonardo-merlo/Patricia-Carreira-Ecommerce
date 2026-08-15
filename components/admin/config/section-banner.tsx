"use client" // edição inline com preview ao vivo

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminIcon } from '@/components/admin/admin-icon'
import { AnnouncementContent } from '@/components/store/announcement-banner'
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  swapAnnouncementOrder,
  type AnnouncementMessage,
} from '@/lib/actions/announcements'
import { Toggle } from './config-parts'

/** Mostra a frase como ela vai aparecer no topo da loja, com o mesmo fundo. */
function Preview({ content }: { content: string }) {
  if (!content.trim()) return null
  return (
    <div className="banner-preview">
      <span className="banner-preview-tag">Prévia</span>
      <div className="banner-preview-strip">
        <AnnouncementContent content={content} />
      </div>
    </div>
  )
}

function MessageRow({
  message,
  index,
  total,
  siblings,
  onChanged,
}: {
  message: AnnouncementMessage
  index: number
  total: number
  siblings: AnnouncementMessage[]
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function apply(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true)
    setError(null)
    const res = await fn()
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível salvar.')
      return false
    }
    onChanged()
    return true
  }

  async function move(direction: -1 | 1) {
    const neighbour = siblings[index + direction]
    if (!neighbour) return
    await apply(() =>
      swapAnnouncementOrder(message.id, message.sort_order, neighbour.id, neighbour.sort_order),
    )
  }

  return (
    <div className="card" style={{ padding: 0, opacity: message.is_active ? 1 : 0.6 }}>
      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button className="icon-btn" aria-label="Mover para cima" disabled={busy || index === 0} onClick={() => move(-1)}>
            <AdminIcon name="chevUp" size={12} />
          </button>
          <button className="icon-btn" aria-label="Mover para baixo" disabled={busy || index === total - 1} onClick={() => move(1)}>
            <AdminIcon name="chevDown" size={12} />
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <>
              <textarea
                className="input"
                rows={2}
                style={{ height: 'auto', padding: 8, resize: 'vertical', width: '100%' }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Conteúdo da mensagem"
              />
              <Preview content={draft} />
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <button
                  className="btn primary sm"
                  disabled={busy}
                  onClick={async () => {
                    if (await apply(() => updateAnnouncement(message.id, { content: draft }))) {
                      setEditing(false)
                    }
                  }}
                >
                  {busy ? 'Salvando…' : 'Salvar'}
                </button>
                <button className="btn ghost sm" disabled={busy} onClick={() => { setDraft(message.content); setEditing(false); setError(null) }}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="banner-preview-strip" style={{ marginBottom: 6 }}>
                <AnnouncementContent content={message.content} />
              </div>
              <code style={{ fontSize: 11, color: 'var(--text-3)', wordBreak: 'break-word' }}>{message.content}</code>
            </>
          )}

          {error && <div className="alert alert-error" style={{ fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>

        {!editing && (
          <div className="row" style={{ gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <Toggle
              value={message.is_active}
              disabled={busy}
              onChange={(v) => apply(() => updateAnnouncement(message.id, { is_active: v }))}
            />
            <button className="icon-btn" title="Editar" aria-label="Editar mensagem" disabled={busy} onClick={() => setEditing(true)}>
              <AdminIcon name="edit" size={13} />
            </button>
            <button className="icon-btn" title="Apagar" aria-label="Apagar mensagem" disabled={busy} onClick={() => setConfirmDelete(true)}>
              <AdminIcon name="x" size={13} />
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>Apagar esta mensagem? Não dá para desfazer.</div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" disabled={busy} onClick={() => setConfirmDelete(false)}>Voltar</button>
            <button
              className="btn danger-outline sm"
              disabled={busy}
              onClick={() => apply(() => deleteAnnouncement(message.id))}
            >
              {busy ? 'Apagando…' : 'Apagar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SectionBanner({ messages }: { messages: AnnouncementMessage[] }) {
  const router = useRouter()
  const [novo, setNovo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function adicionar() {
    setBusy(true)
    setError(null)
    const res = await createAnnouncement(novo)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível salvar.')
      return
    }
    setNovo('')
    router.refresh()
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      <div className="card">
        <div className="card-header"><h3 className="ttl">Como escrever</h3></div>
        <div className="card-body" style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
          Para colocar link numa palavra, escreva <code>[a palavra](o endereço)</code>.
          Para negrito, <code>**assim**</code>. Exemplos:
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li><code>Cupom **BEMVINDA10** na primeira compra</code></li>
            <li><code>Conheça a marca — [Sobre nós](/sobre)</code></li>
            <li><code>Envios internacionais — [Falar no WhatsApp](https://wa.me/5522988223993)</code></li>
          </ul>
          <div style={{ marginTop: 8 }}>
            Link do WhatsApp ganha o ícone sozinho. Endereço que começa com <code>/</code> é
            página da própria loja. Qualquer outra coisa escrita ali aparece como texto.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="ttl">Nova mensagem</h3></div>
        <div className="card-body">
          <textarea
            className="input"
            id="input-nova-mensagem-banner"
            data-testid="input-nova-mensagem-banner"
            rows={2}
            style={{ height: 'auto', padding: 8, resize: 'vertical', width: '100%' }}
            placeholder="Ex.: Frete grátis acima de R$ 599,00"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            aria-label="Nova mensagem do banner"
          />
          <Preview content={novo} />
          {error && <div className="alert alert-error" style={{ fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn primary"
            id="btn-adicionar-mensagem-banner"
            data-testid="btn-adicionar-mensagem-banner"
            disabled={busy || !novo.trim()}
            onClick={adicionar}
          >
            <AdminIcon name="plus" size={12} /> {busy ? 'Adicionando…' : 'Adicionar'}
          </button>
        </div>
      </div>

      <div>
        <div className="cust-meta" style={{ marginBottom: 8 }}>
          {messages.length} mensagem{messages.length !== 1 ? 's' : ''} · a ordem aqui é a ordem em que giram no topo do site
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {messages.length === 0 ? (
            <div className="cust-meta">Nenhuma mensagem cadastrada — o banner não aparece na loja.</div>
          ) : messages.map((m, i) => (
            <MessageRow
              key={m.id}
              message={m}
              index={i}
              total={messages.length}
              siblings={messages}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
