import type { Insight } from '../types'
import { useApp } from '../context/AppContext'

const KIND_LABEL: Record<Insight['kind'], { en: string; pcm: string }> = {
  fact: { en: 'FACT', pcm: 'FACT' },
  inference: { en: 'INFERENCE', pcm: 'INFERENCE' },
  recommendation: { en: 'RECOMMENDATION', pcm: 'RECOMMENDATION' },
}

export function InsightCard({ insight }: { insight: Insight }) {
  const { lang } = useApp()
  const title = lang === 'pcm' ? insight.titlePidgin : insight.title
  const detail = lang === 'pcm' ? insight.detailPidgin : insight.detail

  return (
    <div className="card row" style={{ padding: '14px 16px', gap: 12 }}>
      <div className={`severity-bar severity-${insight.severity}`} />
      <div className="stack" style={{ gap: 4 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className={`chip chip-grey`} style={{ fontSize: 10, padding: '2px 8px' }}>
            {KIND_LABEL[insight.kind][lang]}
          </span>
        </div>
        <h3>{title}</h3>
        <p style={{ color: 'var(--grey)', fontSize: 13.5 }}>{detail}</p>
      </div>
    </div>
  )
}
