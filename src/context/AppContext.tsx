import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BusinessData, Lang, PaymentMethod } from '../types'
import { translations, type TranslationKey } from '../i18n/translations'
import { getAishaKitchenData } from '../data/mockData'
import {
  createBusiness,
  createExpense,
  createSale,
  fetchBusinessData,
  ApiError,
} from '../services/api'

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

const BUSINESS_ID_KEY = 'hustleos.businessId'

interface AppState {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
  screen: Screen
  goTo: (s: Screen) => void
  data: BusinessData | null
  isDemo: boolean
  /** True while the backend request for the live business is in flight. */
  loading: boolean
  /** Human-readable backend error, if the last request failed. */
  error: string | null
  businessId: string | null
  loadDemo: () => void
  setCustomBusiness: (b: BusinessData['business']) => Promise<void>
  resetDemo: () => void
  refresh: () => Promise<void>
  addSale: (s: {
    product: string
    amount: number
    quantity?: number
    paymentMethod: PaymentMethod
  }) => Promise<void>
  addExpense: (e: { category: string; amount: number; note?: string }) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

function readStoredBusinessId(): string | null {
  try {
    return localStorage.getItem(BUSINESS_ID_KEY)
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('pcm')
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [data, setData] = useState<BusinessData | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const t = useMemo(() => {
    return (key: TranslationKey) => translations[lang][key]
  }, [lang])

  const describe = (err: unknown) =>
    err instanceof ApiError ? err.message : 'Something went wrong talking to the server.'

  const loadFromApi = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const fresh = await fetchBusinessData(id)
      setData(fresh)
      setIsDemo(false)
      return true
    } catch (err) {
      console.error(err)
      setError(describe(err))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Reconnect to the saved business on load so a refresh (or a new device with
  // the same saved id) shows the same server-side data instead of mock data.
  useEffect(() => {
    const saved = readStoredBusinessId()
    if (!saved) return
    setBusinessId(saved)
    void loadFromApi(saved).then((ok) => {
      if (ok) setScreen('dashboard')
    })
  }, [loadFromApi])

  const loadDemo = () => {
    setData(getAishaKitchenData())
    setIsDemo(true)
    setBusinessId(null)
    setError(null)
    try {
      localStorage.removeItem(BUSINESS_ID_KEY)
    } catch {
      /* storage unavailable */
    }
    setScreen('dashboard')
  }

  const setCustomBusiness = async (b: BusinessData['business']) => {
    setLoading(true)
    setError(null)
    try {
      const id = await createBusiness(b)
      try {
        localStorage.setItem(BUSINESS_ID_KEY, id)
      } catch {
        /* storage unavailable */
      }
      setBusinessId(id)
      const fresh = await fetchBusinessData(id)
      setData(fresh)
      setIsDemo(false)
      setScreen('dashboard')
    } catch (err) {
      console.error(err)
      setError(describe(err))
    } finally {
      setLoading(false)
    }
  }

  const resetDemo = () => loadDemo()

  const refresh = useCallback(async () => {
    if (!businessId) return
    await loadFromApi(businessId)
  }, [businessId, loadFromApi])

  const addSale: AppState['addSale'] = async (s) => {
    const entry = {
      date: new Date().toISOString().slice(0, 10),
      product: s.product,
      quantity: s.quantity ?? 1,
      amount: s.amount,
      paymentMethod: s.paymentMethod,
    }

    if (!businessId) {
      // Demo mode: keep it local, but still through setState so React re-renders.
      setData((prev) =>
        prev
          ? { ...prev, sales: [{ id: `sale-local-${Date.now()}`, customerId: 'walk-in', ...entry }, ...prev.sales] }
          : prev,
      )
      return
    }

    setError(null)
    try {
      const created = await createSale(businessId, entry)
      setData((prev) => (prev ? { ...prev, sales: [created, ...prev.sales] } : prev))
    } catch (err) {
      console.error(err)
      setError(describe(err))
    }
  }

  const addExpense: AppState['addExpense'] = async (e) => {
    const entry = {
      date: new Date().toISOString().slice(0, 10),
      category: e.category,
      amount: e.amount,
      note: e.note,
    }

    if (!businessId) {
      setData((prev) =>
        prev ? { ...prev, expenses: [{ id: `exp-local-${Date.now()}`, ...entry }, ...prev.expenses] } : prev,
      )
      return
    }

    setError(null)
    try {
      const created = await createExpense(businessId, entry)
      setData((prev) => (prev ? { ...prev, expenses: [created, ...prev.expenses] } : prev))
    } catch (err) {
      console.error(err)
      setError(describe(err))
    }
  }

  const value: AppState = {
    lang,
    setLang,
    t,
    screen,
    goTo: setScreen,
    data,
    isDemo,
    loading,
    error,
    businessId,
    loadDemo,
    setCustomBusiness,
    resetDemo,
    refresh,
    addSale,
    addExpense,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
