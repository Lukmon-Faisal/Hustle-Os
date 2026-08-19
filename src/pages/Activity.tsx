import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatNaira } from '../services/analytics'
import { EmptyState } from '../components/EmptyState'
import type { PaymentMethod } from '../types'

type Tab = 'sales' | 'expenses' | 'invoices' | 'inventory' | 'customers'

export function Activity() {
  const { t, lang, data, goTo } = useApp()
  const [tab, setTab] = useState<Tab>('sales')
  const [showAddSale, setShowAddSale] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)

  const [saleProduct, setSaleProduct] = useState('')
  const [saleAmount, setSaleAmount] = useState('')
  const [salePayment, setSalePayment] = useState<PaymentMethod>('cash')

  const [expCategory, setExpCategory] = useState('')
  const [expAmount, setExpAmount] = useState('')

  const recentSales = useMemo(
    () => (data ? [...data.sales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 25) : []),
    [data],
  )
  const recentExpenses = useMemo(
    () => (data ? [...data.expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 25) : []),
    [data],
  )
  const invoices = useMemo(
    () => (data ? [...data.invoices].sort((a, b) => (a.date < b.date ? 1 : -1)) : []),
    [data],
  )

  if (!data) return null

  const addSale = () => {
    if (!saleProduct || !saleAmount) return
    data.sales.unshift({
      id: `sale-manual-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      product: saleProduct,
      quantity: 1,
      amount: Number(saleAmount),
      paymentMethod: salePayment,
      customerId: 'walk-in',
    })
    setSaleProduct('')
    setSaleAmount('')
    setShowAddSale(false)
  }

  const addExpense = () => {
    if (!expCategory || !expAmount) return
    data.expenses.unshift({
      id: `exp-manual-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      category: expCategory,
      amount: Number(expAmount),
    })
    setExpCategory('')
    setExpAmount('')
    setShowAddExpense(false)
  }

  return (
    <div className="screen stack">
      <h1>{t('activityTitle')}</h1>

      <div className="tab-row">
        {(['sales', 'expenses', 'invoices', 'inventory', 'customers'] as Tab[]).map((tb) => (
          <button
            key={tb}
            className={`tab-btn ${tab === tb ? 'active' : ''}`}
            onClick={() => {
              if (tb === 'inventory' || tb === 'customers') goTo(tb)
              else setTab(tb)
            }}
          >
            {tb === 'sales' && t('sales')}
            {tb === 'expenses' && t('expenses')}
            {tb === 'invoices' && (lang === 'pcm' ? 'Invoices' : 'Invoices')}
            {tb === 'inventory' && t('stockTitle')}
            {tb === 'customers' && t('customersTitle')}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <div className="stack">
          <button className="btn-secondary" onClick={() => setShowAddSale((v) => !v)}>{t('addSale')}</button>
          {showAddSale && (
            <div className="card stack">
              <input className="input-field" placeholder={lang === 'pcm' ? 'Product' : 'Product'} value={saleProduct} onChange={(e) => setSaleProduct(e.target.value)} />
              <input className="input-field" type="number" placeholder="Amount (₦)" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} />
              <select className="input-field" value={salePayment} onChange={(e) => setSalePayment(e.target.value as PaymentMethod)}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="pos">POS</option>
                <option value="credit">Credit</option>
              </select>
              <button className="btn-primary" onClick={addSale}>{t('continueBtn')}</button>
            </div>
          )}
          {recentSales.length === 0 ? (
            <EmptyState titleKey="noSalesYet" subKey="addFirstSale" />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {recentSales.map((s) => (
                <div key={s.id} className="card row-between">
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{s.product}</p>
                    <p style={{ fontSize: 12, color: 'var(--grey)' }}>{s.date} · {s.paymentMethod}</p>
                  </div>
                  <strong>{formatNaira(s.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="stack">
          <button className="btn-secondary" onClick={() => setShowAddExpense((v) => !v)}>{t('addExpense')}</button>
          {showAddExpense && (
            <div className="card stack">
              <input className="input-field" placeholder="Category" value={expCategory} onChange={(e) => setExpCategory(e.target.value)} />
              <input className="input-field" type="number" placeholder="Amount (₦)" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
              <button className="btn-primary" onClick={addExpense}>{t('continueBtn')}</button>
            </div>
          )}
          <div className="stack" style={{ gap: 8 }}>
            {recentExpenses.map((e) => (
              <div key={e.id} className="card row-between">
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{e.category}</p>
                  <p style={{ fontSize: 12, color: 'var(--grey)' }}>{e.date}{e.supplier ? ` · ${e.supplier}` : ''}</p>
                </div>
                <strong>{formatNaira(e.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="stack">
          <button className="btn-secondary">{t('addInvoice')}</button>
          <div className="stack" style={{ gap: 8 }}>
            {invoices.map((inv) => (
              <div key={inv.id} className="card row-between">
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{inv.id.toUpperCase()}</p>
                  <p style={{ fontSize: 12, color: 'var(--grey)' }}>{inv.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block' }}>{formatNaira(inv.amount)}</strong>
                  <span className={`chip ${inv.status === 'paid' ? 'chip-green' : inv.status === 'pending' ? 'chip-amber' : 'chip-red'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
