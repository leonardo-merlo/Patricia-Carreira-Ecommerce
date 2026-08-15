"use client" // formulário com estado local antes de confirmar o cancelamento

import { useState } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import { CANCELLATION_REASONS } from '@/lib/cancellation-reasons'
import { updateOrderStatus } from '@/lib/actions/orders'

interface CancelarPedidoModalProps {
  orderId: string
  displayNum: string
  /** Pedido pago estorna estoque e dispara e-mail — o aviso muda por causa disso. */
  isPaid: boolean
  onClose: () => void
  onCancelled: () => void
}

export function CancelarPedidoModal({
  orderId,
  displayNum,
  isPaid,
  onClose,
  onCancelled,
}: CancelarPedidoModalProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!reason) {
      setError('Selecione o motivo do cancelamento.')
      return
    }
    setLoading(true)
    setError('')
    const res = await updateOrderStatus(orderId, 'cancelled', { reason, notes })
    setLoading(false)
    if (res.success) {
      onCancelled()
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !loading && onClose()}>
      <div
        className="modal"
        id="modal-cancelar-pedido"
        data-testid="modal-cancelar-pedido"
        role="alertdialog"
        aria-modal="true"
        style={{ width: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3>Cancelar pedido {displayNum}</h3>
            <div className="sub">
              {isPaid
                ? 'O estoque dos itens volta e a cliente recebe um e-mail de cancelamento.'
                : 'O pedido será cancelado.'}{' '}
              Não dá para desfazer.
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={loading} aria-label="Fechar">
            <AdminIcon name="x" size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <div className="field">
            <label htmlFor="select-motivo-cancelamento">Motivo *</label>
            <select
              className="select"
              id="select-motivo-cancelamento"
              data-testid="select-motivo-cancelamento"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError('') }}
              disabled={loading}
            >
              <option value="">— Selecionar —</option>
              {CANCELLATION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="input-observacao-cancelamento">Observação (opcional)</label>
            <textarea
              className="input"
              id="input-observacao-cancelamento"
              data-testid="input-observacao-cancelamento"
              rows={3}
              style={{ height: 'auto', padding: 8, resize: 'vertical' }}
              placeholder="Detalhe o que aconteceu, se for útil depois..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ fontSize: 12 }}>{error}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose} disabled={loading}>Voltar</button>
          <button
            className="btn danger-outline"
            id="btn-confirmar-cancelamento"
            data-testid="btn-confirmar-cancelamento"
            onClick={handleConfirm}
            disabled={loading || !reason}
          >
            {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
