import { AppProvider, useApp } from './context/AppContext'
import { BottomNav, TopBar, AskAIFab } from './components/Nav'
import { PageTransition } from './components/PageTransition'
import { Onboarding } from './pages/Onboarding'
import { BusinessSetup } from './pages/BusinessSetup'
import { Dashboard } from './pages/Dashboard'
import { Insights } from './pages/Insights'
import { AIAnalyst } from './pages/AIAnalyst'
import { Passport } from './pages/Passport'
import { Activity } from './pages/Activity'
import { Inventory } from './pages/Inventory'
import { Customers } from './pages/Customers'
import { ActionCenter } from './pages/ActionCenter'
import { WemaEcosystem } from './pages/WemaEcosystem'
import { Settings } from './pages/Settings'

function Router() {
  const { screen } = useApp()

  switch (screen) {
    case 'onboarding':
      return <Onboarding />
    case 'setup':
      return <BusinessSetup />
    case 'dashboard':
      return <Dashboard />
    case 'insights':
      return <Insights />
    case 'ai':
      return <AIAnalyst />
    case 'passport':
      return <Passport />
    case 'activity':
      return <Activity />
    case 'inventory':
      return <Inventory />
    case 'customers':
      return <Customers />
    case 'actions':
      return <ActionCenter />
    case 'wema':
      return <WemaEcosystem />
    case 'settings':
      return <Settings />
    default:
      return <Dashboard />
  }
}

function Shell() {
  const { screen } = useApp()
  const withNav = screen !== 'onboarding' && screen !== 'setup'

  return (
    <div className="app-shell">
      {withNav && <BottomNav />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar />
        {/* Keyed on `screen` so each navigation replays the entrance rather than
            cross-fading one layout into the next. */}
        <PageTransition key={screen}>
          <Router />
        </PageTransition>
      </div>
      <AskAIFab />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
