import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { generateBusinessPassport } from '../services/aiService'

const LEVEL_LABEL_PCM: Record<string, string> = {
  Weak: 'E dey manage',
  Moderate: 'E dey okay',
  Strong: 'E strong',
  'Needs work': 'E need work',
  Good: 'E good',
  Excellent: 'E excellent well well',
}

function LevelChip({ level }: { level: string }) {
  const { lang } = useApp()
  const cls = level === 'Strong' || level === 'Excellent' ? 'chip-green' : level === 'Moderate' || level === 'Good' ? 'chip-purple' : 'chip-amber'
  return <span className={`chip ${cls}`}>{lang === 'pcm' ? LEVEL_LABEL_PCM[level] ?? level : level}</span>
}

export function Passport() {
  const { t, lang, data } = useApp()
  const [shared, setShared] = useState(false)
  const passport = useMemo(() => (data ? generateBusinessPassport(data) : null), [data])

  if (!data || !passport) return null

  return (
    <div className="screen stack">
      <div>
        <h1>{t('passportTitle')}</h1>
        <p style={{ color: 'var(--grey)', marginTop: 4 }}>{t('passportSub')}</p>
      </div>

      <div className="card stack" style={{ background: 'var(--purple-deep)', color: 'var(--white)', gap: 10 }}>
        <span className="eyebrow" style={{ color: 'var(--lavender)' }}>{passport.businessName}</span>
        <div className="row-between">
          <span style={{ fontSize: 13, color: 'var(--lavender)' }}>{lang === 'pcm' ? 'Operating history' : 'Operating history'}</span>
          <strong>{Math.round(passport.operatingHistoryMonths / 12)} {lang === 'pcm' ? 'years' : 'years'}</strong>
        </div>
        <div className="row-between">
          <span style={{ fontSize: 13, color: 'var(--lavender)' }}>{lang === 'pcm' ? 'Verified activity' : 'Verified activity'}</span>
          <strong>{passport.verifiedActivityMonths} {lang === 'pcm' ? 'months' : 'months'}</strong>
        </div>
      </div>

      <div className="card stack" style={{ gap: 14 }}>
        <div className="row-between">
          <span style={{ fontSize: 14 }}>{lang === 'pcm' ? 'Revenue consistency' : 'Revenue consistency'}</span>
          <LevelChip level={passport.revenueConsistency} />
        </div>
        <div className="row-between">
          <span style={{ fontSize: 14 }}>{lang === 'pcm' ? 'Transaction consistency' : 'Transaction consistency'}</span>
          <LevelChip level={passport.transactionConsistency} />
        </div>
        <div className="row-between">
          <span style={{ fontSize: 14 }}>{t('customerRetention')}</span>
          <span className="chip chip-purple">{passport.customerRetentionPct}%</span>
        </div>
        <div className="row-between">
          <span style={{ fontSize: 14 }}>{lang === 'pcm' ? 'Expense stability' : 'Expense stability'}</span>
          <LevelChip level={passport.expenseStability} />
        </div>
        <div className="row-between">
          <span style={{ fontSize: 14 }}>{lang === 'pcm' ? 'Inventory efficiency' : 'Inventory efficiency'}</span>
          <LevelChip level={passport.inventoryEfficiency} />
        </div>
        <div className="row-between">
          <span style={{ fontSize: 14 }}>{lang === 'pcm' ? 'Cash-flow health' : 'Cash-flow health'}</span>
          <LevelChip level={passport.cashFlowHealth} />
        </div>
      </div>

      <div className="card stack">
        <span className="eyebrow">{t('verifiedSignals')}</span>
        <div className="stack" style={{ gap: 8 }}>
          {passport.signals.map((s) => (
            <div key={s.label} className="row" style={{ gap: 8 }}>
              <span style={{ color: s.verified ? 'var(--green)' : 'var(--grey)' }}>{s.verified ? '✓' : '—'}</span>
              <span style={{ fontSize: 13.5 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--grey)' }}>
        {lang === 'pcm'
          ? 'This na structured evidence of your business activity — e no be automatic loan approval or credit score.'
          : 'This is a structured, consent-based view of business activity — not an automatic loan approval or credit score.'}
      </p>

      <button className="btn-primary" onClick={() => setShared(true)}>{t('sharePassport')}</button>

      {shared && (
        <div className="card" style={{ borderColor: 'var(--green)' }}>
          <p style={{ fontSize: 13.5 }}>
            {lang === 'pcm'
              ? 'Prototype connection: your Hustle Passport link don ready for demo — no real data leave this device.'
              : 'Prototype connection: a shareable Passport view is ready for the demo — this is a mock link for the prototype only.'}
          </p>
        </div>
      )}
    </div>
  )
}
