import { useApp } from '../context/AppContext'
import { inventoryDaysRemaining } from '../services/analytics'

export function Inventory() {
  const { t, lang, data } = useApp()
  if (!data) return null

  return (
    <div className="screen stack">
      <h1>{t('stockTitle')}</h1>
      <div className="stack" style={{ gap: 12 }}>
        {data.inventory.map((item) => {
          const daysLeft = inventoryDaysRemaining(item.currentStock, item.dailyVelocity)
          const low = daysLeft <= 3
          const status = low
            ? { en: 'Selling fast', pcm: 'E dey sell fast' }
            : daysLeft <= 7
              ? { en: 'Moving steadily', pcm: 'E dey move well' }
              : { en: 'Well stocked', pcm: 'Stock plenty' }

          return (
            <div key={item.id} className="card stack" style={{ gap: 8 }}>
              <div className="row-between">
                <h3>{item.name}</h3>
                <span className={`chip ${low ? 'chip-red' : 'chip-green'}`}>{lang === 'pcm' ? status.pcm : status.en}</span>
              </div>
              <div className="row-between">
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>{lang === 'pcm' ? 'Wetin remain' : 'Current stock'}</span>
                <strong>{item.currentStock} {item.unit}</strong>
              </div>
              <div className="row-between">
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>{lang === 'pcm' ? 'Days wey remain' : 'Estimated days remaining'}</span>
                <strong style={{ color: low ? 'var(--red)' : 'var(--ink)' }}>
                  {Number.isFinite(daysLeft) ? `${daysLeft} ${lang === 'pcm' ? 'day(s)' : 'day(s)'}` : '—'}
                </strong>
              </div>
              {low && (
                <div className="card" style={{ background: 'var(--amber-bg)', border: 'none', padding: 12 }}>
                  <p style={{ fontSize: 13 }}>
                    {lang === 'pcm'
                      ? `${item.name} fit finish in about ${daysLeft} day(s).`
                      : `${item.name} may run out in about ${daysLeft} day(s).`}
                  </p>
                  <button className="btn-ghost" style={{ padding: '6px 0' }}>{t('seeRecommendation')}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
