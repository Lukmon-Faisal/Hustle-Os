import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { repeatCustomerRate, formatNaira, daysAgo } from '../services/analytics'

export function Customers() {
  const { t, lang, data } = useApp()

  const stats = useMemo(() => {
    if (!data) return null
    const active = data.customers.filter((c) => c.ordersCount > 0)
    const repeat = active.filter((c) => c.ordersCount > 1).length
    const newCustomers = active.filter((c) => c.firstSeen >= daysAgo(29)).length
    const avgOrder = active.length
      ? active.reduce((a, c) => a + c.totalSpend, 0) / active.reduce((a, c) => a + c.ordersCount, 0)
      : 0
    const top = [...active].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 6)
    return { repeat, newCustomers, avgOrder, top, retentionPct: repeatCustomerRate(data) }
  }, [data])

  if (!data || !stats) return null

  return (
    <div className="screen stack">
      <h1>{t('customersTitle')}</h1>

      <div className="grid-2">
        <div className="card">
          <span className="eyebrow">{t('repeatCustomers')}</span>
          <h2 style={{ marginTop: 4 }}>{stats.repeat}</h2>
        </div>
        <div className="card">
          <span className="eyebrow">{t('newCustomers')}</span>
          <h2 style={{ marginTop: 4 }}>{stats.newCustomers}</h2>
        </div>
        <div className="card">
          <span className="eyebrow">{t('avgOrder')}</span>
          <h2 style={{ marginTop: 4 }}>{formatNaira(stats.avgOrder)}</h2>
        </div>
        <div className="card">
          <span className="eyebrow">{t('customerRetention')}</span>
          <h2 style={{ marginTop: 4 }}>{stats.retentionPct}%</h2>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--lavender)' }}>
        <p style={{ fontSize: 13.5 }}>
          {lang === 'pcm'
            ? `${stats.retentionPct}% of your customers come back this month.`
            : `${stats.retentionPct}% of customers returned this month.`}
        </p>
        <p style={{ fontSize: 12, color: 'var(--purple-mid)', marginTop: 6 }}>
          {lang === 'pcm' ? 'Your repeat customers dey drive most of your revenue.' : 'Your repeat customers are driving most of your revenue.'}
        </p>
      </div>

      <div className="stack">
        <h2>{t('topCustomers')}</h2>
        <div className="stack" style={{ gap: 8 }}>
          {stats.top.map((c) => (
            <div key={c.id} className="card row-between">
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</p>
                <p style={{ fontSize: 12, color: 'var(--grey)' }}>{c.ordersCount} {lang === 'pcm' ? 'orders' : 'orders'}</p>
              </div>
              <strong>{formatNaira(c.totalSpend)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
