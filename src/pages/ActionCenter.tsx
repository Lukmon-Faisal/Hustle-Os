import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { generateActionPlan } from '../services/aiService'
import type { ActionItem } from '../types'

const PRIORITY_LABEL: Record<ActionItem['priority'], { en: string; pcm: string; cls: string }> = {
  high: { en: 'HIGH PRIORITY', pcm: 'HIGH PRIORITY', cls: 'chip-red' },
  medium: { en: 'MEDIUM', pcm: 'MEDIUM', cls: 'chip-amber' },
  opportunity: { en: 'OPPORTUNITY', pcm: 'OPPORTUNITY', cls: 'chip-green' },
}

export function ActionCenter() {
  const { t, lang, data } = useApp()
  const actions = useMemo(() => (data ? generateActionPlan(data) : []), [data])

  if (!data) return null

  return (
    <div className="screen stack">
      <h1>{t('actionCenterTitle')}</h1>

      {actions.length === 0 ? (
        <div className="card empty-state">
          <p>{lang === 'pcm' ? 'Nothing dey worry now — your hustle steady.' : 'Nothing urgent right now — your business looks steady.'}</p>
        </div>
      ) : (
        <div className="stack">
          {actions.map((a) => (
            <div key={a.id} className="card stack" style={{ gap: 10 }}>
              <span className={`chip ${PRIORITY_LABEL[a.priority].cls}`} style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                {lang === 'pcm' ? PRIORITY_LABEL[a.priority].pcm : PRIORITY_LABEL[a.priority].en}
              </span>
              <h3>{lang === 'pcm' ? a.titlePidgin : a.title}</h3>
              <div className="stack" style={{ gap: 4 }}>
                <p style={{ fontSize: 13, color: 'var(--grey)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{lang === 'pcm' ? 'Why e matter: ' : 'Why it matters: '}</strong>
                  {lang === 'pcm' ? a.whyPidgin : a.why}
                </p>
                <p style={{ fontSize: 13, color: 'var(--grey)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{lang === 'pcm' ? 'Wetin e go do: ' : 'Expected impact: '}</strong>
                  {lang === 'pcm' ? a.impactPidgin : a.impact}
                </p>
              </div>
              <button className="btn-secondary">{lang === 'pcm' ? a.nextStepPidgin : a.nextStep}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
