import { AlertTriangle, ArrowRight, RotateCw, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ActionsSkeleton, DashboardSkeleton, PassportSkeleton } from './Skeleton'

/**
 * Shown while an AI endpoint request is in flight.
 *
 * `variant` picks a skeleton shaped like the content that's coming, so the swap
 * when data lands causes no layout shift. `plain` is the fallback for callers
 * with no distinctive shape to mimic.
 */
export function LoadingCard({
  variant = 'plain',
  label,
}: {
  variant?: 'plain' | 'dashboard' | 'actions' | 'passport'
  label?: string
}) {
  const { lang } = useApp()

  if (variant === 'dashboard') return <DashboardSkeleton />
  if (variant === 'actions') return <ActionsSkeleton />
  if (variant === 'passport') return <PassportSkeleton />

  return (
    <div className="card stack" style={{ gap: 12 }} aria-busy="true">
      <div className="row" style={{ gap: 8, color: 'var(--purple-mid)' }}>
        <Sparkles size={15} aria-hidden />
        <span style={{ fontSize: 12.5, fontWeight: 650 }}>
          {label ??
            (lang === 'pcm' ? 'HUSTLE AI dey check your numbers...' : 'HUSTLE AI is checking your numbers...')}
        </span>
      </div>
      <div className="skeleton skeleton-text" style={{ width: '100%' }} aria-hidden />
      <div className="skeleton skeleton-text" style={{ width: '76%' }} aria-hidden />
    </div>
  )
}

/**
 * Shown when an AI endpoint request fails. Keeps the friendly copy the app
 * already uses, with the technical detail underneath so a failing deploy is
 * diagnosable without opening the console.
 */
export function ErrorCard({ detail, onRetry }: { detail: string; onRetry?: () => void }) {
  const { t } = useApp()
  return (
    <div className="card stack" style={{ gap: 10, borderColor: 'rgba(190, 18, 60, 0.28)' }}>
      <div className="row" style={{ gap: 8 }}>
        <AlertTriangle size={16} color="var(--red)" aria-hidden style={{ flex: '0 0 auto' }} />
        <p style={{ fontSize: 13.5, fontWeight: 600 }}>{t('aiTakingBreak')}</p>
      </div>
      <p style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>{detail}</p>
      {onRetry && (
        <button
          className="mic-btn"
          style={{ alignSelf: 'flex-start' }}
          onClick={onRetry}
          type="button"
        >
          <RotateCw size={14} aria-hidden />
          {t('tryAgain')}
        </button>
      )}
    </div>
  )
}

/**
 * Demo mode holds its dataset in the browser and has no server-side business,
 * so the AI endpoints have nothing to analyse. Say so plainly rather than
 * spinning forever or showing an empty panel.
 */
export function DemoAiNotice() {
  const { lang, goTo } = useApp()
  return (
    <div className="card stack" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 8, color: 'var(--purple-mid)' }}>
        <Sparkles size={15} aria-hidden />
        <span className="eyebrow" style={{ margin: 0 }}>
          {lang === 'pcm' ? 'AI dey sleep for demo' : 'AI is offline in demo'}
        </span>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
        {lang === 'pcm'
          ? 'AI analysis dey run for server, so demo data no fit use am. Set up your business make you see insight from your own numbers.'
          : 'AI analysis runs on the server, so it cannot read demo data. Set up your business to get insights from your own numbers.'}
      </p>
      <button className="mic-btn" style={{ alignSelf: 'flex-start' }} onClick={() => goTo('setup')} type="button">
        {lang === 'pcm' ? 'Set up my business' : 'Set up my business'}
        <ArrowRight size={14} aria-hidden />
      </button>
    </div>
  )
}
