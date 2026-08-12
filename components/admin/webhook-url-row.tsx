'use client'

// Client component apenas pelo botão de copiar (navigator.clipboard).
// A URL completa, com token, existe só nesta página do admin — o que a tela
// mostra é a versão com o token reduzido.

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import type { WebhookUrl } from '@/lib/server/diagnostics'

export function WebhookUrlRow({ webhook, index }: { webhook: WebhookUrl; index: number }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(webhook.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <tr id={`webhook-row-${index}`} data-testid="webhook-row">
      <td style={{ fontWeight: 600 }}>{webhook.service}</td>
      <td>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, wordBreak: 'break-all' }}>
          {webhook.display}
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>{webhook.where}</div>
      </td>
      <td>
        <span className={`badge ${webhook.ready ? 'ok' : 'warn'}`}>
          {webhook.ready ? 'pronta' : 'incompleta'}
        </span>
      </td>
      <td>
        <button
          type="button"
          className="btn sm"
          id={`btn-copiar-webhook-${index}`}
          data-testid="btn-copiar-webhook"
          onClick={copy}
          disabled={!webhook.ready}
        >
          <AdminIcon name={copied ? 'check' : 'list'} />
          {copied ? 'Copiado' : 'Copiar URL'}
        </button>
      </td>
    </tr>
  )
}
