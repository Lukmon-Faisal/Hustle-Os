import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { HealthGauge } from '../components/HealthGauge'
import { InsightCard } from '../components/InsightCard'
import { analyzeBusinessHealth, generateBusinessInsights, generateActionPlan } from '../services/aiService'
import { sumSales, sumExpenses, countSales, formatNaira } from '../services/analytics'
import { EmptyState } from '../components/EmptyState'

export function Dashboard() {
  const { t, lang, data, goTo } = useApp()

  const health = useMemo(() => (data ? analyzeBusinessHealth(data) : null), [data])
  const insights = useMemo(() => (data ? generateBusinessInsights(data).slice(0, 4) : []), [data])
  const actions = useMemo(() => (data ? generateActionPlan(data) : []), [data])

  if (!data) return null

  const hasSales = data.sales.length > 0
  const revenue30 = sumSales(data, 30)
  const expenses30 = sumExpenses(data, 30)
  const profit30 = revenue30 - expenses30
  const salesCount30 = countSales(data, 30)
  const topAction = actions[0]

  return (
    <div className="screen stack">
      <div>
        <h1>{t('goodAfternoon')}, {data.business.name.split(' ')[0].replace(/'s$/, '').replace(/’s$/, '')} 👋</h1>
        <p style={{ color: 'var(--grey)', marginTop: 4 }}>{t('checkHustle')}</p>
      </div>

      {!hasSales ? (
        <EmptyState titleKey="noSalesYet" subKey="addFirstSale" onAction={() => goTo('activity')} actionLabel={t('addSale')} />
      ) : (
        <>
          <div className="card health-card row" style={{ gap: 20, alignItems: 'center' }}>
            <HealthGauge score={health!.overall} dark />
            <div className="stack" style={{ gap: 6 }}>
              <span className="eyebrow">{t('hustleHealth')}</span>
              <p style={{ fontSize: 14 }}>{lang === 'pcm' ? health!.summaryPidgin : health!.summary}</p>
            </div>
          </div>

          <div className="stat-grid">
            <div className="card stat-card" style={{ ['--accent' as string]: 'var(--green)' }}>
              <span className="eyebrow">{t('moneyIn')}</span>
              <h2 style={{ marginTop: 4 }}>{formatNaira(revenue30)}</h2>
            </div>
            <div className="card stat-card" style={{ ['--accent' as string]: 'var(--red)' }}>
              <span className="eyebrow">{t('moneyOut')}</span>
              <h2 style={{ marginTop: 4 }}>{formatNaira(expenses30)}</h2>
            </div>
            <div className="card stat-card" style={{ ['--accent' as string]: profit30 >= 0 ? 'var(--green)' : 'var(--red)' }}>
              <span className="eyebrow">{t('estProfit')}</span>
              <h2 style={{ marginTop: 4, color: profit30 >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatNaira(profit30)}</h2>
            </div>
            <div className="card stat-card" style={{ ['--accent' as string]: 'var(--purple-mid)' }}>
              <span className="eyebrow">{t('sales')}</span>
              <h2 style={{ marginTop: 4 }}>{salesCount30}</h2>
            </div>
          </div>

          <div className="stack">
            <h2>{t('whatsHappening')}</h2>
            <div className="stack" style={{ gap: 10 }}>
              {insights.map((ins) => (
                <InsightCard key={ins.id} insight={ins} />
              ))}
            </div>
          </div>

          {topAction && (
            <div className="card" style={{ background: 'var(--purple-deep)', color: 'var(--white)' }}>
              <span className="eyebrow" style={{ color: 'var(--lavender)' }}>{t('aiRecommendation')}</span>
              <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--white)' }}>
                {lang === 'pcm' ? topAction.nextStepPidgin : topAction.nextStep}
              </p>
              <button
                className="btn-secondary"
                style={{ marginTop: 14, background: 'transparent', color: 'var(--white)', borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => goTo('ai')}
              >
                {t('askAI')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
