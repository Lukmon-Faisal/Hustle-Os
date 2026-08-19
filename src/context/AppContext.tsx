import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BusinessData, Lang } from '../types'
import { translations, type TranslationKey } from '../i18n/translations'
import { getAishaKitchenData, emptyBusinessData } from '../data/mockData'

export type Screen =
  | 'onboarding'
  | 'setup'
  | 'dashboard'
  | 'insights'
  | 'ai'
  | 'passport'
  | 'activity'
  | 'inventory'
  | 'customers'
  | 'actions'
  | 'wema'
  | 'settings'

interface AppState {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
  screen: Screen
  goTo: (s: Screen) => void
  data: BusinessData | null
  isDemo: boolean
  loadDemo: () => void
  setCustomBusiness: (b: BusinessData['business']) => void
  resetDemo: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('pcm')
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [data, setData] = useState<BusinessData | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const t = useMemo(() => {
    return (key: TranslationKey) => translations[lang][key]
  }, [lang])

  const loadDemo = () => {
    setData(getAishaKitchenData())
    setIsDemo(true)
    setScreen('dashboard')
  }

  const setCustomBusiness = (b: BusinessData['business']) => {
    setData(emptyBusinessData(b))
    setIsDemo(false)
    setScreen('dashboard')
  }

  const resetDemo = () => {
    setData(getAishaKitchenData())
    setIsDemo(true)
    setScreen('dashboard')
  }

  const value: AppState = {
    lang,
    setLang,
    t,
    screen,
    goTo: setScreen,
    data,
    isDemo,
    loadDemo,
    setCustomBusiness,
    resetDemo,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
