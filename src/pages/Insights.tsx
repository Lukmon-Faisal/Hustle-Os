import { useMemo, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useApp } from '../context/AppContext'
import { dailySeries, weeklySeries, salesByProduct, expensesByCategory, repeatCustomerRate, periodOverPeriod, formatNaira } from '../services/analytics'

type Period = 7 | 30 | 90

export function Insights() {
  const { t, lang, data } = useApp()
  const [period, setPeriod] = useState<Period>(30)

  const series = useMemo(() => {
    if (!data) return []
    return period === 90 ? weeklySeries(data, 12) : dailySeries(data, period)
  }, [data, period])

  const xKey = period === 90 ? 'week' : 'date'
  const productBreakdown = useMemo(() => (data ? salesByProduct(data, period) : []), [data, period])
  const expenseBreakdown = useMemo(() => (data ? expensesByCategory(data, period) : []), [data, period])
  const pop = useMemo(() => (data ? periodOverPeriod(data, period) : null), [data, period])
  const retention = data ? repeatCustomerRate(data) : 0

  if (!data) return null

  return (
    <div className="screen stack">
      <h1>{t('insightsTitle')}</h1>

      <div className="tab-row">
        {([7, 30, 90] as Period[]).map((p) => (
          <button key={p} className={`tab-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {t(p === 7 ? 'days7' : p === 30 ? 'days30' : 'days90')}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="row-between">
          <span className="eyebrow">{t('revenue')} vs {t('expenses')}</span>
        </div>
        <div style={{ width: '100%', height: 180, marginTop: 8 }}>
          <ResponsiveContainer>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6D28D9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6D28D9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B45309" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#B45309" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" tickFormatter={(v) => (period === 90 ? v : v.slice(5))} />
              <YAxis tick={{ fontSize: 10 }} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatNaira(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#6D28D9" fill="url(#rev)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#B45309" fill="url(#exp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {pop && (
          <p style={{ fontSize: 13, color: 'var(--grey)', marginTop: 6 }}>
            {lang === 'pcm'
              ? `Money wey enter change ${Math.round(pop.revenueChangePct)}%, expenses change ${Math.round(pop.expenseChangePct)}% for this period.`
              : `Revenue moved ${Math.round(pop.revenueChangePct)}%, while expenses moved ${Math.round(pop.expenseChangePct)}% over this period.`}
          </p>
        )}
      </div>

      <div className="card">
        <span className="eyebrow">{t('profitTrend')}</span>
        <div style={{ width: '100%', height: 150, marginTop: 8 }}>
          <ResponsiveContainer>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" tickFormatter={(v) => (period === 90 ? v : v.slice(5))} />
              <YAxis tick={{ fontSize: 10 }} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatNaira(v)} />
              <Area type="monotone" dataKey="profit" stroke="#059669" fill="url(#profit)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: 13, color: 'var(--grey)', marginTop: 6 }}>
          {lang === 'pcm'
            ? 'Your sales dey rise steady, but profit no always follow the same pattern — chicken supplier cost dey affect am.'
            : 'Your revenue is rising steadily, but profit does not always follow the same pattern — supplier cost is a factor.'}
        </p>
      </div>

      <div className="card">
        <span className="eyebrow">{t('bestSelling')}</span>
        <div style={{ width: '100%', height: 170, marginTop: 8 }}>
          <ResponsiveContainer>
            <BarChart data={productBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="product" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatNaira(v)} />
              <Bar dataKey="revenue" fill="#2E1065" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <span className="eyebrow">{t('expenseBreakdown')}</span>
        <div className="stack" style={{ marginTop: 10, gap: 10 }}>
          {expenseBreakdown
            .sort((a, b) => b.amount - a.amount)
            .map((e) => {
              const max = Math.max(...expenseBreakdown.map((x) => x.amount), 1)
              return (
                <div key={e.category}>
                  <div className="progress-row">
                    <span style={{ fontSize: 13 }}>{e.category}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatNaira(e.amount)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(e.amount / max) * 100}%`, background: 'var(--amber)' }} />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      <div className="card">
        <span className="eyebrow">{t('customerRetention')}</span>
        <h2 style={{ marginTop: 4 }}>{retention}%</h2>
        <p style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>
          {lang === 'pcm' ? 'Repeat customers dey drive most of your revenue.' : 'Repeat customers are driving most of your revenue.'}
        </p>
      </div>
    </div>
  )
}
