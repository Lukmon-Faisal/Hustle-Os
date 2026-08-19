import { useApp } from '../context/AppContext'

export function Onboarding() {
  const { t, lang, setLang, goTo, loadDemo } = useApp()

  return (
    <div className="screen stack" style={{ paddingTop: 48, justifyContent: 'space-between', minHeight: '100vh' }}>
      <div className="row-between">
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--purple-deep)' }}>
          {t('appName')}
        </strong>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'pcm' ? 'active' : ''} onClick={() => setLang('pcm')}>Pidgin</button>
        </div>
      </div>

      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 20 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
          <circle cx="70" cy="70" r="68" fill="var(--lavender)" />
          <path d="M40 90 L58 62 L76 78 L100 42" stroke="var(--purple-deep)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="100" cy="42" r="7" fill="var(--purple-deep)" />
          <rect x="36" y="96" width="68" height="8" rx="4" fill="var(--purple-mid)" opacity="0.35" />
        </svg>
        <h1>{t('onboardHeadline')}</h1>
        <p style={{ color: 'var(--grey)', fontSize: 15, maxWidth: 320 }}>{t('onboardSub')}</p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <button className="btn-primary" onClick={() => goTo('setup')}>{t('startHustle')}</button>
        <button className="btn-secondary" onClick={loadDemo}>{t('continueDemo')}</button>
      </div>
    </div>
  )
}
