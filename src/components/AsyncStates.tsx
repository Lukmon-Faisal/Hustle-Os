import { useApp } from '../context/AppContext'

/** Shown while an AI endpoint request is in flight. */
export function LoadingCard({ label }: { label?: string }) {
  const { lang } = useApp()
  return (
    <div className="card" style={{ color: 'var(--grey)', fontSize: 13.5 }}>
      {label ??
        (lang === 'pcm'
          ? 'HUSTLE AI dey check your numbers...'
          : 'HUSTLE AI is checking your numbers...')}
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
    <div className="card stack" style={{ gap: 8, borderColor: 'var(--red)' }}>
      <p style={{ fontSize: 13.5 }}>{t('aiTakingBreak')}</p>
      <p style={{ fontSize: 12, color: 'var(--grey)' }}>{detail}</p>
      {onRetry && (
        <button className="btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={onRetry}>
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
    <div className="card stack" style={{ gap: 10 }}>
      <p style={{ fontSize: 13.5 }}>
        {lang === 'pcm'
          ? 'AI analysis dey run for server, so demo data no fit use am. Set up your business make you see insight from your own numbers.'
          : 'AI analysis runs on the server, so it cannot read demo data. Set up your business to get insights from your own numbers.'}
      </p>
      <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => goTo('setup')}>
        {lang === 'pcm' ? 'Set up my business' : 'Set up my business'}
      </button>
    </div>
  )
}
