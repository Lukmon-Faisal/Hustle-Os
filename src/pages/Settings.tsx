import { useApp, type Screen } from '../context/AppContext'

export function Settings() {
  const { t, lang, setLang, data, isDemo, resetDemo, goTo } = useApp()
  if (!data) return null

  const links: { screen: Screen; label: string; icon: string }[] = [
    { screen: 'actions', label: t('actionCenterTitle'), icon: '⚡' },
    { screen: 'wema', label: t('wemaTitle'), icon: '⌁' },
    { screen: 'inventory', label: t('stockTitle'), icon: '▤' },
    { screen: 'customers', label: t('customersTitle'), icon: '☺' },
  ]

  return (
    <div className="screen stack">
      <h1>{t('settingsTitle')}</h1>

      {isDemo && (
        <div className="card row-between" style={{ background: 'var(--lavender)' }}>
          <span className="chip chip-purple">{t('demoMode')}</span>
          <button className="btn-ghost" onClick={resetDemo}>{t('resetDemo')}</button>
        </div>
      )}

      <div className="card stack" style={{ gap: 4 }}>
        <span className="eyebrow">{lang === 'pcm' ? 'Business profile' : 'Business profile'}</span>
        <h3>{data.business.name}</h3>
        <p style={{ fontSize: 13, color: 'var(--grey)' }}>{data.business.type} · {data.business.location}</p>
      </div>

      <div className="card row-between">
        <span style={{ fontSize: 14, fontWeight: 600 }}>{t('language')}</span>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'pcm' ? 'active' : ''} onClick={() => setLang('pcm')}>Pidgin</button>
        </div>
      </div>

      <div className="card stack" style={{ gap: 0, padding: 6 }}>
        {links.map((l) => (
          <button
            key={l.screen}
            className="row-between"
            style={{ background: 'transparent', border: 'none', padding: '12px 10px', width: '100%', textAlign: 'left' }}
            onClick={() => goTo(l.screen)}
          >
            <span className="row" style={{ gap: 10 }}>
              <span aria-hidden>{l.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{l.label}</span>
            </span>
            <span style={{ color: 'var(--grey)' }}>›</span>
          </button>
        ))}
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <div className="row-between"><span style={{ fontSize: 14 }}>{t('notifications')}</span><span style={{ color: 'var(--grey)' }}>›</span></div>
        <hr className="divider" />
        <div className="row-between"><span style={{ fontSize: 14 }}>{t('privacy')}</span><span style={{ color: 'var(--grey)' }}>›</span></div>
        <hr className="divider" />
        <div className="row-between"><span style={{ fontSize: 14 }}>{t('dataPermissions')}</span><span style={{ color: 'var(--grey)' }}>›</span></div>
        <hr className="divider" />
        <div className="row-between"><span style={{ fontSize: 14 }}>{t('help')}</span><span style={{ color: 'var(--grey)' }}>›</span></div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--grey)', textAlign: 'center' }}>{t('dataOwnership')}</p>
    </div>
  )
}
