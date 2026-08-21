import { Activity, BarChart3, Home, IdCard, MessageSquare, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp, type Screen } from '../context/AppContext'

const NAV_ITEMS: {
  screen: Screen
  labelKey: 'navHome' | 'navInsights' | 'navPassport' | 'navActivity' | 'navMore'
  Icon: LucideIcon
}[] = [
  { screen: 'dashboard', labelKey: 'navHome', Icon: Home },
  { screen: 'insights', labelKey: 'navInsights', Icon: BarChart3 },
  { screen: 'passport', labelKey: 'navPassport', Icon: IdCard },
  { screen: 'activity', labelKey: 'navActivity', Icon: Activity },
  { screen: 'settings', labelKey: 'navMore', Icon: MoreHorizontal },
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
        {NAV_ITEMS.map(({ screen: target, labelKey, Icon }) => (
          <button
            key={target}
            className={`nav-item ${screen === target ? 'active' : ''}`}
            onClick={() => goTo(target)}
            aria-current={screen === target ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={screen === target ? 2.2 : 1.8} aria-hidden />
            <span>{t(labelKey)}</span>
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
      <MessageSquare size={15} aria-hidden />
      {t('askAI')}
    </button>
  )
}
