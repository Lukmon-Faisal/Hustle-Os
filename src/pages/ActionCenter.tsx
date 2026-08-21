import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { DemoAiNotice, ErrorCard, LoadingCard } from '../components/AsyncStates'
import { listItem, listStagger } from '../components/PageTransition'
import { useApiResource } from '../hooks/useApiResource'
import { fetchActions } from '../services/api'
import type { ActionItem } from '../types'

const PRIORITY_LABEL: Record<ActionItem['priority'], { en: string; pcm: string; cls: string }> = {
  high: { en: 'HIGH PRIORITY', pcm: 'HIGH PRIORITY', cls: 'chip-red' },
  medium: { en: 'MEDIUM', pcm: 'MEDIUM', cls: 'chip-amber' },
  opportunity: { en: 'OPPORTUNITY', pcm: 'OPPORTUNITY', cls: 'chip-green' },
}

export function ActionCenter() {
  const { t, lang, data, businessId } = useApp()

  const loader = useMemo(
    () => (businessId ? () => fetchActions(businessId) : null),
    [businessId],
  )
  const { data: actions, loading, error, reload } = useApiResource(loader)

  if (!data) return null

  return (
    <div className="screen stack">
      <h1>{t('actionCenterTitle')}</h1>

      {!businessId ? (
        <DemoAiNotice />
      ) : loading ? (
        <LoadingCard variant="actions" />
      ) : error ? (
        <ErrorCard detail={error} onRetry={reload} />
      ) : !actions || actions.length === 0 ? (
        <div className="card empty-state">
          <p>{lang === 'pcm' ? 'Nothing dey worry now — your hustle steady.' : 'Nothing urgent right now — your business looks steady.'}</p>
        </div>
      ) : (
        <motion.div className="stack" variants={listStagger} initial="hidden" animate="show">
          {actions.map((a) => (
            <motion.div key={a.id} className="card stack" style={{ gap: 12 }} variants={listItem}>
              <span className={`chip ${PRIORITY_LABEL[a.priority].cls}`} style={{ alignSelf: 'flex-start' }}>
                {lang === 'pcm' ? PRIORITY_LABEL[a.priority].pcm : PRIORITY_LABEL[a.priority].en}
              </span>
              <h3>{lang === 'pcm' ? a.titlePidgin : a.title}</h3>
              <div className="stack" style={{ gap: 6 }}>
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
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
