import { useState } from 'react'
import { useApp } from '../context/AppContext'

const FLOW = [
  { en: 'Wema Business Account', pcm: 'Wema Business Account' },
  { en: 'Payments', pcm: 'Payments' },
  { en: 'Transactions', pcm: 'Transactions' },
  { en: 'HUSTLE OS Intelligence', pcm: 'HUSTLE OS Intelligence' },
  { en: 'Business Passport', pcm: 'Hustle Passport' },
  { en: 'Relevant Financial Opportunities', pcm: 'Relevant Financial Opportunities' },
]

const SERVICES = [
  { en: 'Business banking', pcm: 'Business banking' },
  { en: 'Payment collection', pcm: 'Payment collection' },
  { en: 'Financial insights', pcm: 'Financial insights' },
  { en: 'Relevant business services', pcm: 'Relevant business services' },
]

export function WemaEcosystem() {
  const { t, lang } = useApp()
  const [showConsent, setShowConsent] = useState(false)
  const [connected, setConnected] = useState(false)

  return (
    <div className="screen stack">
      <h1>{t('wemaTitle')}</h1>
      <p style={{ color: 'var(--grey)' }}>
        {lang === 'pcm'
          ? 'This na concept — na potential future connection, no be live API now.'
          : 'This is a concept — a potential future integration, not a live connected API.'}
      </p>

      <div className="card stack" style={{ gap: 0 }}>
        {FLOW.map((step, i) => (
          <div key={step.en} className="stack" style={{ gap: 0 }}>
            <div className="row" style={{ gap: 10, padding: '8px 0' }}>
              <span className="chip chip-purple" style={{ fontSize: 11 }}>{i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{lang === 'pcm' ? step.pcm : step.en}</span>
            </div>
            {i < FLOW.length - 1 && <div style={{ height: 14, width: 1, background: 'var(--grey-light)', marginLeft: 12 }} />}
          </div>
        ))}
      </div>

      <div className="stack">
        <h2>{lang === 'pcm' ? 'Wetin fit connect' : 'Potential future integrations'}</h2>
        <div className="grid-2">
          {SERVICES.map((s) => (
            <div key={s.en} className="card" style={{ padding: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'pcm' ? s.pcm : s.en}</span>
              <div style={{ marginTop: 6 }}>
                <span className="chip chip-grey" style={{ fontSize: 10 }}>
                  {lang === 'pcm' ? 'Prototype connection' : 'Prototype connection'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {connected ? (
        <div className="card" style={{ borderColor: 'var(--green)' }}>
          <p style={{ fontSize: 13.5, color: 'var(--green)' }}>
            {lang === 'pcm' ? 'Prototype consent don save. No real Wema account dey connected.' : 'Prototype consent saved. No real Wema account is connected.'}
          </p>
        </div>
      ) : (
        <button className="btn-primary" onClick={() => setShowConsent(true)}>{t('connectWema')}</button>
      )}

      {showConsent && !connected && (
        <div className="card stack">
          <h3>{lang === 'pcm' ? 'Prototype consent screen' : 'Prototype consent screen'}</h3>
          <p style={{ fontSize: 13, color: 'var(--grey)' }}>
            {lang === 'pcm'
              ? 'This na prototype demo — e no go connect any real Wema Bank account or data.'
              : 'This is a prototype demonstration — it will not connect to any real Wema Bank account or data.'}
          </p>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn-secondary" onClick={() => setShowConsent(false)}>{lang === 'pcm' ? 'Cancel' : 'Cancel'}</button>
            <button
              className="btn-primary"
              onClick={() => {
                setConnected(true)
                setShowConsent(false)
              }}
            >
              {lang === 'pcm' ? 'I agree' : 'I agree'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
