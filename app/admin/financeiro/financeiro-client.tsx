'use client'
// Client component: state, transitions, browser interactions

import { useState, useTransition, useMemo } from 'react'
import {
  createAccountPayable,
  updateAccountPayable,
  deleteAccountPayable,
  markAccountAsPaid,
} from '@/lib/actions/financeiro'
import {
  type AccountPayable,
  type AccountPayableStatus,
  type ExpenseCategory,
  type PaymentMethod,
  type RecurrenceMonths,
  EXPENSE_CATEGORIES,
  getAccountStatus,
} from '@/lib/types'

type FilterTab = 'todas' | 'pendentes' | 'em_atraso' | 'pagas'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
]

const STATUS_LABELS: Record<AccountPayableStatus, string> = {
  pending: 'Pendente',
  overdue: 'Em atraso',
  paid: 'Pago',
}

const STATUS_CLASS: Record<AccountPayableStatus, string> = {
  pending: 'badge badge-yellow',
  overdue: 'badge badge-red',
  paid: 'badge badge-green',
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type FormState = {
  description: string
  amount: string
  due_date: string
  category: ExpenseCategory | ''
  creditor: string
  payment_method: PaymentMethod | ''
  is_recurring: boolean
  recurrence_months: RecurrenceMonths
  notes: string
}

const emptyForm: FormState = {
  description: '',
  amount: '',
  due_date: '',
  category: '',
  creditor: '',
  payment_method: '',
  is_recurring: false,
  recurrence_months: 1,
  notes: '',
}

type MarkPaidState = {
  account: AccountPayable
  paidAt: string
  paymentMethod: PaymentMethod | ''
}

export function FinanceiroClient({
  initialAccounts,
  monthlyRevenue,
}: {
  initialAccounts: AccountPayable[]
  monthlyRevenue: number
}) {
  const [accounts, setAccounts] = useState<AccountPayable[]>(initialAccounts)
  const [activeTab, setActiveTab] = useState<FilterTab>('todas')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [markPaid, setMarkPaid] = useState<MarkPaidState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const in7days = new Date(today)
  in7days.setDate(in7days.getDate() + 7)
  const in7daysStr = in7days.toISOString().split('T')[0]
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const kpis = useMemo(() => {
    const totalPaidThisMonth = accounts
      .filter(a => {
        if (!a.paid_at) return false
        const d = new Date(a.paid_at + 'T00:00:00')
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((s, a) => s + a.amount, 0)

    return {
      totalPending: accounts
        .filter(a => !a.paid_at)
        .reduce((s, a) => s + a.amount, 0),
      totalOverdue: accounts
        .filter(a => !a.paid_at && a.due_date < todayStr)
        .reduce((s, a) => s + a.amount, 0),
      totalPaidThisMonth,
      dueSoon: accounts.filter(
        a => !a.paid_at && a.due_date >= todayStr && a.due_date <= in7daysStr
      ).length,
      resultado: monthlyRevenue - totalPaidThisMonth,
    }
  }, [accounts, todayStr, in7daysStr, currentMonth, currentYear, monthlyRevenue])

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const status = getAccountStatus(a)
      if (activeTab === 'pendentes') return status === 'pending'
      if (activeTab === 'em_atraso') return status === 'overdue'
      if (activeTab === 'pagas') return status === 'paid'
      return true
    })
  }, [accounts, activeTab])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setDrawerOpen(true)
  }

  function openEdit(account: AccountPayable) {
    setEditingId(account.id)
    setForm({
      description: account.description,
      amount: String(account.amount),
      due_date: account.due_date,
      category: account.category,
      creditor: account.creditor ?? '',
      payment_method: account.payment_method ?? '',
      is_recurring: account.is_recurring,
      recurrence_months: account.recurrence_months ?? 1,
      notes: account.notes ?? '',
    })
    setError(null)
    setDrawerOpen(true)
  }

  function handleField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!form.description || !form.amount || !form.due_date || !form.category) {
      setError('Preencha os campos obrigatórios: descrição, valor, vencimento e categoria.')
      return
    }
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setError('Valor inválido.')
      return
    }

    startTransition(async () => {
      const input = {
        description: form.description,
        amount,
        due_date: form.due_date,
        category: form.category as ExpenseCategory,
        creditor: form.creditor || null,
        payment_method: (form.payment_method as PaymentMethod) || null,
        is_recurring: form.is_recurring,
        recurrence_months: form.is_recurring ? form.recurrence_months : null,
        notes: form.notes || null,
      }

      const result = editingId
        ? await updateAccountPayable(editingId, input)
        : await createAccountPayable(input)

      if (!result.success) {
        setError(result.error ?? 'Erro ao salvar.')
        return
      }

      if (editingId) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === editingId
              ? { ...a, ...input, category: input.category, updated_at: new Date().toISOString() }
              : a
          )
        )
      } else {
        setAccounts(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            ...input,
            category: input.category,
            paid_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as AccountPayable,
        ])
      }
      setDrawerOpen(false)
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteAccountPayable(deleteId)
      if (result.success) {
        setAccounts(prev => prev.filter(a => a.id !== deleteId))
      }
      setDeleteId(null)
    })
  }

  function openMarkPaid(account: AccountPayable) {
    setMarkPaid({ account, paidAt: todayStr, paymentMethod: '' })
  }

  function handleMarkPaid() {
    if (!markPaid || !markPaid.paymentMethod) return
    startTransition(async () => {
      const result = await markAccountAsPaid(
        markPaid.account,
        markPaid.paidAt,
        markPaid.paymentMethod as PaymentMethod
      )
      if (result.success) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === markPaid.account.id
              ? { ...a, paid_at: markPaid.paidAt, payment_method: markPaid.paymentMethod as PaymentMethod }
              : a
          )
        )
        if (markPaid.account.is_recurring && markPaid.account.recurrence_months) {
          const nextDue = new Date(markPaid.account.due_date + 'T00:00:00')
          nextDue.setMonth(nextDue.getMonth() + markPaid.account.recurrence_months)
          setAccounts(prev => [
            ...prev,
            {
              ...markPaid.account,
              id: crypto.randomUUID(),
              due_date: nextDue.toISOString().split('T')[0],
              paid_at: null,
              payment_method: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
        }
      }
      setMarkPaid(null)
    })
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Controle de contas a pagar</p>
        </div>
        <button id="btn-nova-conta" className="btn btn-primary" onClick={openCreate}>
          + Nova Conta
        </button>
      </div>

      {/* Resultado do mês */}
      <div className="stats-grid" style={{ marginBottom: 12 }}>
        <div className="stat-card">
          <p className="stat-label">Receitas do mês</p>
          <p className="stat-value">{formatCurrency(monthlyRevenue)}</p>
          <p className="stat-description">pedidos pagos</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Despesas pagas</p>
          <p className="stat-value">{formatCurrency(kpis.totalPaidThisMonth)}</p>
          <p className="stat-description">saídas confirmadas</p>
        </div>
        <div className={`stat-card ${kpis.resultado >= 0 ? 'stat-card-success' : 'stat-card-alert'}`}>
          <p className="stat-label">Resultado do mês</p>
          <p className="stat-value">{formatCurrency(kpis.resultado)}</p>
          <p className="stat-description">{kpis.resultado >= 0 ? 'positivo' : 'negativo'}</p>
        </div>
      </div>

      {/* Contas a pagar */}
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total a Pagar</p>
          <p className="stat-value">{formatCurrency(kpis.totalPending)}</p>
          <p className="stat-description">contas pendentes</p>
        </div>
        <div className="stat-card stat-card-alert">
          <p className="stat-label">Em Atraso</p>
          <p className="stat-value">{formatCurrency(kpis.totalOverdue)}</p>
          <p className="stat-description">vencimento passado</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Vencem em 7 dias</p>
          <p className="stat-value">{kpis.dueSoon}</p>
          <p className="stat-description">contas próximas</p>
        </div>
      </div>

      <div className="tabs">
        {(['todas', 'pendentes', 'em_atraso', 'pagas'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'todas'
              ? 'Todas'
              : tab === 'pendentes'
              ? 'Pendentes'
              : tab === 'em_atraso'
              ? 'Em atraso'
              : 'Pagas'}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table" data-testid="accounts-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Credor</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Forma de Pgto</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="table-empty">
                  Nenhuma conta encontrada.
                </td>
              </tr>
            )}
            {filtered.map(account => {
              const status = getAccountStatus(account)
              return (
                <tr key={account.id}>
                  <td>
                    {account.description}
                    {account.is_recurring && (
                      <span className="badge badge-blue" style={{ marginLeft: 6 }}>
                        {account.recurrence_months === 1 ? 'Mensal' : 'Anual'}
                      </span>
                    )}
                  </td>
                  <td>{account.category}</td>
                  <td>{account.creditor ?? '—'}</td>
                  <td>{formatCurrency(account.amount)}</td>
                  <td>{formatDate(account.due_date)}</td>
                  <td>
                    {account.payment_method
                      ? PAYMENT_METHODS.find(m => m.value === account.payment_method)?.label ??
                        account.payment_method
                      : '—'}
                  </td>
                  <td>
                    <span className={STATUS_CLASS[status]}>{STATUS_LABELS[status]}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {status !== 'paid' && (
                        <button
                          className="btn btn-sm btn-success"
                          id={`btn-pagar-${account.id}`}
                          onClick={() => openMarkPaid(account)}
                          title="Marcar como pago"
                        >
                          Pago
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-ghost"
                        id={`btn-editar-conta-${account.id}`}
                        onClick={() => openEdit(account)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-danger-ghost"
                        id={`btn-deletar-conta-${account.id}`}
                        onClick={() => setDeleteId(account.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Drawer: Criar / Editar */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div
            className="drawer"
            onClick={e => e.stopPropagation()}
            data-testid="account-drawer"
          >
            <div className="drawer-header">
              <h2>{editingId ? 'Editar Conta' : 'Nova Conta a Pagar'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDrawerOpen(false)}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <input
                  id="input-descricao-conta"
                  className="form-input"
                  value={form.description}
                  onChange={e => handleField('description', e.target.value)}
                  placeholder="Ex: Aluguel do espaço"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Valor (R$) *</label>
                  <input
                    id="input-valor-conta"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => handleField('amount', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vencimento *</label>
                  <input
                    id="input-vencimento-conta"
                    className="form-input"
                    type="date"
                    value={form.due_date}
                    onChange={e => handleField('due_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Categoria *</label>
                <select
                  id="select-categoria-conta"
                  className="form-select"
                  value={form.category}
                  onChange={e => handleField('category', e.target.value as ExpenseCategory)}
                >
                  <option value="">Selecione...</option>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Credor / Fornecedor</label>
                <input
                  id="input-credor-conta"
                  className="form-input"
                  value={form.creditor}
                  onChange={e => handleField('creditor', e.target.value)}
                  placeholder="Ex: Locadora São João"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select
                  id="select-pagamento-conta"
                  className="form-select"
                  value={form.payment_method}
                  onChange={e =>
                    handleField('payment_method', e.target.value as PaymentMethod)
                  }
                >
                  <option value="">Não informado</option>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    id="checkbox-recorrente"
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={e => handleField('is_recurring', e.target.checked)}
                  />
                  <span>Conta recorrente</span>
                </label>
              </div>

              {form.is_recurring && (
                <div className="form-group">
                  <label className="form-label">Recorrência</label>
                  <select
                    id="select-recorrencia-conta"
                    className="form-select"
                    value={form.recurrence_months}
                    onChange={e =>
                      handleField('recurrence_months', Number(e.target.value) as RecurrenceMonths)
                    }
                  >
                    <option value={1}>Mensal</option>
                    <option value={12}>Anual</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  id="textarea-obs-conta"
                  className="form-textarea"
                  value={form.notes}
                  onChange={e => handleField('notes', e.target.value)}
                  rows={3}
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
            <div className="drawer-footer">
              <button className="btn btn-ghost" onClick={() => setDrawerOpen(false)}>
                Cancelar
              </button>
              <button
                id="btn-salvar-conta"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" data-testid="delete-modal">
            <h3 className="modal-title">Excluir conta?</h3>
            <p className="modal-body">Esta ação não pode ser desfeita.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>
                Cancelar
              </button>
              <button
                id="btn-confirmar-exclusao-conta"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Marcar como pago */}
      {markPaid && (
        <div className="modal-overlay">
          <div className="modal" data-testid="mark-paid-modal">
            <h3 className="modal-title">Marcar como pago</h3>
            <p className="modal-body">{markPaid.account.description}</p>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Data do pagamento</label>
              <input
                className="form-input"
                type="date"
                value={markPaid.paidAt}
                onChange={e =>
                  setMarkPaid(prev => (prev ? { ...prev, paidAt: e.target.value } : null))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Forma de pagamento *</label>
              <select
                id="select-forma-pagamento-pago"
                className="form-select"
                value={markPaid.paymentMethod}
                onChange={e =>
                  setMarkPaid(prev =>
                    prev ? { ...prev, paymentMethod: e.target.value as PaymentMethod } : null
                  )
                }
              >
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {markPaid.account.is_recurring && (
              <p className="form-hint">
                Conta recorrente. O próximo vencimento será gerado automaticamente.
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setMarkPaid(null)}>
                Cancelar
              </button>
              <button
                id="btn-confirmar-pagamento"
                className="btn btn-success"
                onClick={handleMarkPaid}
                disabled={isPending || !markPaid.paymentMethod}
              >
                {isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
