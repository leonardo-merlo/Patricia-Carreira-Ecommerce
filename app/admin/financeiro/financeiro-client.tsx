'use client'
// Client component: state, transitions, browser interactions

import { useState, useTransition, useMemo } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import {
  createAccountPayable,
  updateAccountPayable,
  deleteAccountPayable,
  markAccountAsPaid,
  fetchMonthlyRevenue,
} from '@/lib/actions/financeiro'
import { getStores, createStore, updateStore, deleteStore } from '@/lib/actions/stores'
import {
  type AccountPayable,
  type AccountPayableStatus,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type RecurrenceMonths,
  type Store,
  EXPENSE_CATEGORIES,
  getAccountStatus,
} from '@/lib/types'

type FilterTab = 'todas' | 'pendentes' | 'em_atraso' | 'pagas'

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
]

function statusBadge(status: AccountPayableStatus): { label: string; cls: string } {
  if (status === 'paid') return { label: 'Pago', cls: 'badge pago' }
  if (status === 'overdue') return { label: 'Em atraso', cls: 'badge alert' }
  return { label: 'Pendente', cls: 'badge pendente' }
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type FormState = {
  description: string
  amount: string
  due_date: string
  category: ExpenseCategory | ''
  creditor: string
  store_id: string
  payment_method: ExpensePaymentMethod | ''
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
  store_id: '',
  payment_method: '',
  is_recurring: false,
  recurrence_months: 1,
  notes: '',
}

type StoreForm = { id: string | null; name: string; city: string; notes: string }
const emptyStoreForm: StoreForm = { id: null, name: '', city: '', notes: '' }

type MarkPaidState = {
  account: AccountPayable
  paidAt: string
  paymentMethod: ExpensePaymentMethod | ''
}

export function FinanceiroClient({
  initialAccounts,
  monthlyRevenue,
  initialStores,
}: {
  initialAccounts: AccountPayable[]
  monthlyRevenue: number
  initialStores: Store[]
}) {
  const nowInit = new Date()
  const initPeriod = `${nowInit.getFullYear()}-${String(nowInit.getMonth() + 1).padStart(2, '0')}`

  const [accounts, setAccounts] = useState<AccountPayable[]>(initialAccounts)
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [showStores, setShowStores] = useState(false)
  const [storeForm, setStoreForm] = useState<StoreForm>(emptyStoreForm)
  const [storeError, setStoreError] = useState<string | null>(null)

  const storeName = (id: string | null) => (id ? stores.find(s => s.id === id)?.name ?? null : null)

  async function refreshStores() {
    setStores(await getStores())
  }

  function handleSaveStore() {
    if (!storeForm.name.trim()) { setStoreError('Informe o nome da loja.'); return }
    setStoreError(null)
    startTransition(async () => {
      const payload = { name: storeForm.name, city: storeForm.city || null, notes: storeForm.notes || null }
      const result = storeForm.id
        ? await updateStore(storeForm.id, payload)
        : await createStore(payload)
      if (!result.success) { setStoreError(result.error); return }
      await refreshStores()
      setStoreForm(emptyStoreForm)
    })
  }

  function handleDeleteStore(id: string) {
    startTransition(async () => {
      const result = await deleteStore(id)
      if (result.success) {
        await refreshStores()
        if (storeForm.id === id) setStoreForm(emptyStoreForm)
      }
    })
  }
  const [selectedPeriod, setSelectedPeriod] = useState(initPeriod)
  const [displayRevenue, setDisplayRevenue] = useState(monthlyRevenue)
  const [activeTab, setActiveTab] = useState<FilterTab>('todas')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [markPaid, setMarkPaid] = useState<MarkPaidState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const in7days = new Date(today)
  in7days.setDate(in7days.getDate() + 7)
  const in7daysStr = in7days.toISOString().split('T')[0]

  const kpis = useMemo(() => {
    const totalPaidThisMonth = accounts
      .filter(a => a.paid_at?.startsWith(selectedPeriod))
      .reduce((s, a) => s + a.amount, 0)

    return {
      totalPending: accounts.filter(a => !a.paid_at).reduce((s, a) => s + a.amount, 0),
      totalOverdue: accounts
        .filter(a => !a.paid_at && a.due_date < todayStr)
        .reduce((s, a) => s + a.amount, 0),
      totalPaidThisMonth,
      dueSoon: accounts.filter(
        a => !a.paid_at && a.due_date >= todayStr && a.due_date <= in7daysStr
      ).length,
      resultado: displayRevenue - totalPaidThisMonth,
    }
  }, [accounts, todayStr, in7daysStr, selectedPeriod, displayRevenue])

  const pendingAffiliateAccounts = useMemo(
    () => accounts.filter(a => a.partner_id && !a.paid_at).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [accounts],
  )

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const s = getAccountStatus(a)
      // Período: para contas pagas filtra por paid_at; para as demais, por due_date
      const dateForPeriod = s === 'paid' ? a.paid_at : a.due_date
      if (!dateForPeriod?.startsWith(selectedPeriod)) return false
      if (activeTab === 'pendentes') return s === 'pending'
      if (activeTab === 'em_atraso') return s === 'overdue'
      if (activeTab === 'pagas') return s === 'paid'
      return true
    })
  }, [accounts, activeTab, selectedPeriod])

  async function handlePeriodChange(period: string) {
    setSelectedPeriod(period)
    const [y, m] = period.split('-').map(Number)
    const { revenue } = await fetchMonthlyRevenue(y, m - 1)
    setDisplayRevenue(revenue)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
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
      store_id: account.store_id ?? '',
      payment_method: account.payment_method ?? '',
      is_recurring: account.is_recurring,
      recurrence_months: account.recurrence_months ?? 1,
      notes: account.notes ?? '',
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  function handleField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!form.description.trim()) { setFormError('Informe a descrição.'); return }
    if (!form.amount) { setFormError('Informe o valor.'); return }
    if (!form.due_date) { setFormError('Informe o vencimento.'); return }
    if (!form.category) { setFormError('Selecione a categoria.'); return }
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { setFormError('Valor inválido.'); return }

    startTransition(async () => {
      const input = {
        description: form.description.trim(),
        amount,
        due_date: form.due_date,
        category: form.category as ExpenseCategory,
        creditor: form.creditor || null,
        store_id: form.store_id || null,
        payment_method: (form.payment_method as ExpensePaymentMethod) || null,
        is_recurring: form.is_recurring,
        recurrence_months: form.is_recurring ? form.recurrence_months : null,
        notes: form.notes || null,
      }

      const result = editingId
        ? await updateAccountPayable(editingId, input)
        : await createAccountPayable(input)

      if (!result.success) {
        setFormError(result.error ?? 'Erro ao salvar.')
        return
      }

      if (editingId) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === editingId
              ? { ...a, ...input, updated_at: new Date().toISOString() }
              : a
          )
        )
      } else {
        setAccounts(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            ...input,
            paid_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as AccountPayable,
        ])
      }
      closeDrawer()
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteAccountPayable(deleteId)
      if (result.success) setAccounts(prev => prev.filter(a => a.id !== deleteId))
      setDeleteId(null)
    })
  }

  function handleMarkPaid() {
    if (!markPaid || !markPaid.paymentMethod) return
    startTransition(async () => {
      const result = await markAccountAsPaid(
        markPaid.account.id,
        markPaid.paidAt,
        markPaid.paymentMethod as ExpensePaymentMethod
      )
      if (result.success) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === markPaid.account.id
              ? { ...a, paid_at: markPaid.paidAt, payment_method: markPaid.paymentMethod as ExpensePaymentMethod }
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

  const resultadoColor = kpis.resultado >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Financeiro</h2>
          <p className="page-sub">Contas a pagar e resultado do mês</p>
        </div>
        <div className="page-actions">
          <button className="btn" id="btn-gerenciar-lojas" onClick={() => { setStoreForm(emptyStoreForm); setStoreError(null); setShowStores(true) }}>
            <AdminIcon name="store" /> Lojas
          </button>
          <button className="btn primary" id="btn-nova-conta" onClick={openCreate}>
            <AdminIcon name="plus" /> Nova conta
          </button>
        </div>
      </div>

      {/* Resultado do mês — 3 colunas */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-label">
            <span className="dot" style={{ background: 'var(--green)' }} />
            Receitas do período
          </div>
          <div className="kpi-value">{fmtCurrency(displayRevenue)}</div>
          <div className="kpi-trend"><span className="subtle">pedidos pagos</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="dot" style={{ background: 'var(--red)' }} />
            Despesas pagas
          </div>
          <div className="kpi-value">{fmtCurrency(kpis.totalPaidThisMonth)}</div>
          <div className="kpi-trend"><span className="subtle">saídas confirmadas</span></div>
        </div>
        <div className="kpi" style={{ borderLeft: `3px solid ${resultadoColor}` }}>
          <div className="kpi-label">
            <span className="dot" style={{ background: resultadoColor }} />
            Resultado do mês
          </div>
          <div className="kpi-value" style={{ color: resultadoColor }}>
            {fmtCurrency(kpis.resultado)}
          </div>
          <div className="kpi-trend">
            <span className="subtle">{kpis.resultado >= 0 ? 'positivo' : 'negativo'}</span>
          </div>
        </div>
      </div>

      {/* Contas a pagar — 3 colunas */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi">
          <div className="kpi-label">
            <span className="dot" style={{ background: 'var(--accent)' }} />
            Total a pagar
          </div>
          <div className="kpi-value">{fmtCurrency(kpis.totalPending)}</div>
          <div className="kpi-trend"><span className="subtle">contas pendentes</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="dot" style={{ background: 'var(--red)' }} />
            Em atraso
          </div>
          <div className="kpi-value" style={{ color: kpis.totalOverdue > 0 ? 'var(--red)' : undefined }}>
            {fmtCurrency(kpis.totalOverdue)}
          </div>
          <div className="kpi-trend"><span className="subtle">vencimento passado</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="dot" style={{ background: 'var(--yellow)' }} />
            Vencem em 7 dias
          </div>
          <div className="kpi-value">{kpis.dueSoon}</div>
          <div className="kpi-trend"><span className="subtle">contas próximas</span></div>
        </div>
      </div>

      {/* Comissões de afiliadas pendentes */}
      {pendingAffiliateAccounts.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <h3 className="ttl">Comissões de afiliadas a pagar</h3>
              <div className="cust-meta" style={{ marginTop: 2, fontSize: 11.5 }}>
                {pendingAffiliateAccounts.length} pendente{pendingAffiliateAccounts.length !== 1 ? 's' : ''} ·{' '}
                {fmtCurrency(pendingAffiliateAccounts.reduce((s, a) => s + a.amount, 0))} no total
              </div>
            </div>
          </div>
          <div className="card-body flush">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Afiliada</th>
                    <th>Referência</th>
                    <th style={{ width: 130 }}>Vencimento</th>
                    <th style={{ width: 120 }}>Valor</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAffiliateAccounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.creditor ?? '—'}</td>
                      <td className="cust-meta">{a.reference_month}</td>
                      <td className="cust-meta">{fmtDate(a.due_date)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmtCurrency(a.amount)}</td>
                      <td>
                        <button
                          className="btn sm primary"
                          onClick={() => setMarkPaid({ account: a, paidAt: todayStr, paymentMethod: '' })}
                        >
                          Dar baixa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + seletor de período */}
      <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', marginTop: 24, marginBottom: 18 }}>
        <div className="tabs" style={{ marginTop: 0, marginBottom: 0, borderBottom: 'none', flex: 1 }}>
          {(['todas', 'pendentes', 'em_atraso', 'pagas'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'todas' ? 'Todas'
                : tab === 'pendentes' ? 'Pendentes'
                : tab === 'em_atraso' ? 'Em atraso'
                : 'Pagas'}
            </button>
          ))}
        </div>
        <div style={{ paddingBottom: 8 }}>
          <input
            type="month"
            className="input"
            style={{ width: 132, height: 26, fontSize: 12, padding: '3px 8px' }}
            value={selectedPeriod}
            onChange={e => e.target.value && handlePeriodChange(e.target.value)}
            title="Filtrar por período"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="card-body flush">
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
              <AdminIcon name="wallet" size={32} />
              <p style={{ marginTop: 12, fontSize: 14 }}>Nenhuma conta encontrada.</p>
              {activeTab === 'todas' && (
                <button className="btn primary" style={{ marginTop: 16 }} onClick={openCreate}>
                  Criar primeira conta
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl" data-testid="accounts-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th style={{ width: 130 }}>Categoria</th>
                    <th style={{ width: 140 }}>Loja</th>
                    <th style={{ width: 150 }}>Credor</th>
                    <th style={{ width: 110 }}>Valor</th>
                    <th style={{ width: 110 }}>Vencimento</th>
                    <th style={{ width: 120 }}>Forma de pgto</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 110 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(account => {
                    const status = getAccountStatus(account)
                    const { label, cls } = statusBadge(status)
                    return (
                      <tr key={account.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span>{account.description}</span>
                            {account.is_recurring && (
                              <span className="badge producao" style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                                {account.recurrence_months === 1 ? 'Mensal' : 'Anual'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{account.category}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{storeName(account.store_id) ?? '—'}</td>
                        <td style={{ color: 'var(--text-2)' }}>{account.creditor ?? '—'}</td>
                        <td className="num" style={{ fontWeight: 500 }}>{fmtCurrency(account.amount)}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{fmtDate(account.due_date)}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                          {account.payment_method
                            ? PAYMENT_METHODS.find(m => m.value === account.payment_method)?.label ?? account.payment_method
                            : '—'}
                        </td>
                        <td><span className={cls}>{label}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {status !== 'paid' && (
                              <button
                                className="btn sm"
                                style={{ background: 'var(--green-soft)', color: 'var(--green)', borderColor: 'transparent' }}
                                id={`btn-pagar-${account.id}`}
                                onClick={() => setMarkPaid({ account, paidAt: todayStr, paymentMethod: '' })}
                                title="Marcar como pago"
                              >
                                Pago
                              </button>
                            )}
                            <button
                              className="icon-btn"
                              id={`btn-editar-conta-${account.id}`}
                              onClick={() => openEdit(account)}
                              title="Editar"
                            >
                              <AdminIcon name="edit" size={14} />
                            </button>
                            <button
                              className="icon-btn"
                              style={{ color: 'var(--text-3)' }}
                              id={`btn-deletar-conta-${account.id}`}
                              onClick={() => setDeleteId(account.id)}
                              title="Excluir"
                            >
                              <AdminIcon name="trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Drawer: Criar / Editar */}
      <div
        className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
      />
      <div className={`drawer ${drawerOpen ? 'open' : ''}`} data-testid="account-drawer">
        <div className="drawer-header">
          <div>
            <h3>{editingId ? 'Editar Conta' : 'Nova Conta a Pagar'}</h3>
            <div className="cust-meta">
              {editingId ? 'Altere os dados abaixo' : 'Preencha os dados da conta'}
            </div>
          </div>
          <button className="icon-btn" onClick={closeDrawer}>
            <AdminIcon name="x" size={14} />
          </button>
        </div>

        <div className="drawer-body">
          <div style={{ display: 'grid', gap: 12 }}>
            {formError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
                {formError}
              </div>
            )}

            <div className="field">
              <label>Descrição *</label>
              <input
                id="input-descricao-conta"
                className="input"
                value={form.description}
                onChange={e => handleField('description', e.target.value)}
                placeholder="Ex: Aluguel do espaço"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Valor (R$) *</label>
                <input
                  id="input-valor-conta"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={e => handleField('amount', e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="field">
                <label>Vencimento *</label>
                <input
                  id="input-vencimento-conta"
                  className="input"
                  type="date"
                  value={form.due_date}
                  onChange={e => handleField('due_date', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Categoria *</label>
              <select
                id="select-categoria-conta"
                className="input"
                value={form.category}
                onChange={e => handleField('category', e.target.value as ExpenseCategory)}
              >
                <option value="">Selecione...</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Credor / Fornecedor</label>
              <input
                id="input-credor-conta"
                className="input"
                value={form.creditor}
                onChange={e => handleField('creditor', e.target.value)}
                placeholder="Ex: Locadora São João"
              />
            </div>

            <div className="field">
              <label>Loja</label>
              <select
                id="select-loja-conta"
                className="input"
                value={form.store_id}
                onChange={e => handleField('store_id', e.target.value)}
              >
                <option value="">— Sem loja —</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ''}</option>
                ))}
              </select>
              <button
                type="button"
                className="linkish"
                style={{ marginTop: 4, fontSize: 12, alignSelf: 'flex-start' }}
                onClick={() => { setStoreForm(emptyStoreForm); setStoreError(null); setShowStores(true) }}
              >
                + Gerenciar lojas
              </button>
            </div>

            <div className="field">
              <label>Forma de pagamento</label>
              <select
                id="select-pagamento-conta"
                className="input"
                value={form.payment_method}
                onChange={e => handleField('payment_method', e.target.value as ExpensePaymentMethod)}
              >
                <option value="">Não informado</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  id="checkbox-recorrente"
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={e => handleField('is_recurring', e.target.checked)}
                />
                Conta recorrente
              </label>
            </div>

            {form.is_recurring && (
              <div className="field">
                <label>Recorrência</label>
                <select
                  id="select-recorrencia-conta"
                  className="input"
                  value={form.recurrence_months}
                  onChange={e => handleField('recurrence_months', Number(e.target.value) as RecurrenceMonths)}
                >
                  <option value={1}>Mensal</option>
                  <option value={12}>Anual</option>
                </select>
              </div>
            )}

            <div className="field">
              <label>Observações</label>
              <textarea
                id="textarea-obs-conta"
                className="input"
                value={form.notes}
                onChange={e => handleField('notes', e.target.value)}
                rows={3}
                placeholder="Informações adicionais..."
                style={{ height: 'auto' }}
              />
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn ghost" onClick={closeDrawer}>Cancelar</button>
          <button
            id="btn-salvar-conta"
            className="btn primary"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar conta'}
          </button>
        </div>
      </div>

      {/* Modal: Confirmar exclusão */}
      {deleteId && (
        <>
          <div className="drawer-backdrop open" style={{ zIndex: 200 }} onClick={() => setDeleteId(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, zIndex: 201, width: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }} data-testid="delete-modal">
            <h4 style={{ marginBottom: 8, fontSize: 15, fontWeight: 600 }}>Excluir conta?</h4>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button
                id="btn-confirmar-exclusao-conta"
                className="btn"
                style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal: Marcar como pago */}
      {markPaid && (
        <>
          <div className="drawer-backdrop open" style={{ zIndex: 200 }} onClick={() => setMarkPaid(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, zIndex: 201, width: 360,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }} data-testid="mark-paid-modal">
            <h4 style={{ marginBottom: 4, fontSize: 15, fontWeight: 600 }}>Confirmar pagamento</h4>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
              {markPaid.account.description}
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              <div className="field">
                <label>Data do pagamento</label>
                <input
                  className="input"
                  type="date"
                  value={markPaid.paidAt}
                  onChange={e => setMarkPaid(prev => prev ? { ...prev, paidAt: e.target.value } : null)}
                />
              </div>

              <div className="field">
                <label>Forma de pagamento *</label>
                <select
                  id="select-forma-pagamento-pago"
                  className="input"
                  value={markPaid.paymentMethod}
                  onChange={e => setMarkPaid(prev => prev ? { ...prev, paymentMethod: e.target.value as ExpensePaymentMethod } : null)}
                >
                  <option value="">Selecione...</option>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {markPaid.account.is_recurring && (
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 6 }}>
                  Conta recorrente — o próximo vencimento será gerado automaticamente.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setMarkPaid(null)}>Cancelar</button>
              <button
                id="btn-confirmar-pagamento"
                className="btn"
                style={{
                  background: !markPaid.paymentMethod ? undefined : 'var(--green)',
                  color: !markPaid.paymentMethod ? undefined : '#fff',
                  borderColor: !markPaid.paymentMethod ? undefined : 'var(--green)',
                }}
                onClick={handleMarkPaid}
                disabled={isPending || !markPaid.paymentMethod}
              >
                {isPending ? 'Confirmando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal: Gerenciar lojas */}
      {showStores && (
        <>
          <div className="drawer-backdrop open" style={{ zIndex: 200 }} onClick={() => setShowStores(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, zIndex: 201, width: 420, maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }} data-testid="stores-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600 }}>Lojas</h4>
                <div className="cust-meta">Unidades para vincular às contas a pagar</div>
              </div>
              <button className="icon-btn" onClick={() => setShowStores(false)}><AdminIcon name="x" size={14} /></button>
            </div>

            {stores.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 14px' }}>Nenhuma loja cadastrada ainda.</p>
            ) : (
              <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
                {stores.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                      {s.city && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{s.city}</div>}
                    </div>
                    <button className="icon-btn" title="Editar" onClick={() => { setStoreForm({ id: s.id, name: s.name, city: s.city ?? '', notes: s.notes ?? '' }); setStoreError(null) }}>
                      <AdminIcon name="edit" size={13} />
                    </button>
                    <button className="icon-btn" style={{ color: 'var(--text-3)' }} title="Remover" onClick={() => handleDeleteStore(s.id)} disabled={isPending}>
                      <AdminIcon name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                {storeForm.id ? 'Editar loja' : 'Nova loja'}
              </div>
              <div className="field">
                <label>Nome *</label>
                <input className="input" value={storeForm.name} onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Loja Centro" />
              </div>
              <div className="field">
                <label>Cidade</label>
                <input className="input" value={storeForm.city} onChange={e => setStoreForm(p => ({ ...p, city: e.target.value }))} placeholder="Ex: Arraial d'Ajuda" />
              </div>
              {storeError && <div style={{ color: 'var(--red)', fontSize: 12 }}>{storeError}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {storeForm.id && (
                  <button className="btn ghost" onClick={() => { setStoreForm(emptyStoreForm); setStoreError(null) }}>Cancelar edição</button>
                )}
                <button className="btn primary" onClick={handleSaveStore} disabled={isPending}>
                  {isPending ? 'Salvando...' : storeForm.id ? 'Salvar loja' : 'Adicionar loja'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
