import { useApp, type Screen } from '../context/AppContext'

const ICON_PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9',
  insights: 'M4 19V10M10 19V5M16 19v-7M20 19V9',
  passport: 'M6 3.5h9a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 19V6a2.5 2.5 0 0 1 2.5-2.5Zm4.5 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3.5 8.5c.6-1.8 2-2.5 3.5-2.5s2.9.7 3.5 2.5',
  activity: 'M3 12h4l2.5-7 4 14 2.5-7H21',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

function NavIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

const NAV_ITEMS: { screen: Screen; labelKey: 'navHome' | 'navInsights' | 'navPassport' | 'navActivity' | 'navMore'; icon: string; glyph: string }[] = [
  { screen: 'dashboard', labelKey: 'navHome', icon: 'home', glyph: '⌂' },
  { screen: 'insights', labelKey: 'navInsights', icon: 'insights', glyph: '◈' },
  { screen: 'passport', labelKey: 'navPassport', icon: 'passport', glyph: '⧉' },
  { screen: 'activity', labelKey: 'navActivity', icon: 'activity', glyph: '≡' },
  { screen: 'settings', labelKey: 'navMore', icon: 'more', glyph: '•••' },
]

export function BottomNav() {
  const { screen, goTo, t, lang, setLang, data } = useApp()
  if (screen === 'onboarding' || screen === 'setup') return null

  const bizName = data?.business.name ?? ''
  const initial = bizName.trim().charAt(0).toUpperCase() || 'H'

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="sidebar-brand">
        <span className="mark" aria-hidden>H</span>
        <span className="word">
          {t('appName')}
          <small>{t('tagline')}</small>
        </span>
      </div>

      <div className="sidebar-lang lang-toggle" role="group" aria-label="Language">
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        <button className={lang === 'pcm' ? 'active' : ''} onClick={() => setLang('pcm')}>Pidgin</button>
      </div>

      <div className="sidebar-items">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.screen}
            className={`nav-item ${screen === item.screen ? 'active' : ''}`}
            onClick={() => goTo(item.screen)}
            aria-current={screen === item.screen ? 'page' : undefined}
          >
            <span className="icon-glyph" aria-hidden style={{ fontSize: 16 }}>{item.glyph}</span>
            <NavIcon name={item.icon} />
            <span>{t(item.labelKey)}</span>
            <span className="dot" />
          </button>
        ))}
      </div>

      {data && (
        <div className="sidebar-foot">
          <span className="avatar" aria-hidden>{initial}</span>
          <div style={{ minWidth: 0 }}>
            <div className="biz-name">{bizName}</div>
            <div className="biz-sub">{t('demoMode')}</div>
          </div>
        </div>
      )}
    </nav>
  )
}

export function TopBar() {
  const { lang, setLang, t, screen } = useApp()
  if (screen === 'onboarding') return null

  return (
    <div className="topbar">
      <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--purple-deep)' }}>{t('appName')}</strong>
      <div className="lang-toggle" role="group" aria-label="Language">
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        <button className={lang === 'pcm' ? 'active' : ''} onClick={() => setLang('pcm')}>Pidgin</button>
      </div>
    </div>
  )
}

export function AskAIFab() {
  const { goTo, screen, t } = useApp()
  if (screen === 'onboarding' || screen === 'setup' || screen === 'ai') return null
  return (
    <button className="fab-ai" onClick={() => goTo('ai')}>
      💬 {t('askAI')}
    </button>
  )
}
