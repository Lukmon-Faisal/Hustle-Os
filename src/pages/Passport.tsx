import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { DemoAiNotice, ErrorCard, LoadingCard } from '../components/AsyncStates'
import { useApiResource } from '../hooks/useApiResource'
import { fetchPassport } from '../services/api'
import { formatNaira } from '../services/analytics'
import type { BusinessPassport } from '../types'

const TIER_CHIP: Record<BusinessPassport['credit_risk_tier'], string> = {
  A: 'chip-green',
  B: 'chip-purple',
  C: 'chip-amber',
  D: 'chip-red',
}

const TIER_NOTE: Record<BusinessPassport['credit_risk_tier'], { en: string; pcm: string }> = {
  A: { en: 'Trades on almost every day of the month', pcm: 'E dey sell almost every day of the month' },
  B: { en: 'Trades on most days of the month', pcm: 'E dey sell most days of the month' },
  C: { en: 'Trades irregularly across the month', pcm: 'E no dey sell steady for the month' },
  D: { en: 'Too little recorded trading to size an offer', pcm: 'Sales wey dey recorded too small to size any offer' },
}

const STABILITY_CHIP: Record<BusinessPassport['expense_stability_index'], string> = {
  High: 'chip-green',
  Medium: 'chip-purple',
  Low: 'chip-amber',
}

const INVENTORY_CHIP: Record<BusinessPassport['inventory_health_status'], string> = {
  Excellent: 'chip-green',
  'Needs Work': 'chip-amber',
  Critical: 'chip-red',
}

/** A metric row: label on the left, a chip on the right. */
function MetricRow({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="row-between">
      <span style={{ fontSize: 14 }}>{label}</span>
      <span className={`chip ${cls}`}>{value}</span>
    </div>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export function Passport() {
  const { t, lang, data, businessId } = useApp()
  const [shared, setShared] = useState(false)

  const loader = useMemo(
    () => (businessId ? () => fetchPassport(businessId) : null),
    [businessId],
  )
  const { data: passport, loading, error, reload } = useApiResource(loader)

  if (!data) return null

  // A backend still serving the pre-Phase-4 passport shape has no
  // credit_risk_tier, which would make every lookup below undefined and crash
  // the page. During a staged deploy (frontend out before API) that is the
  // likely state, so say what's wrong instead of showing a blank screen.
  const contractMismatch = !!passport && !TIER_NOTE[passport.credit_risk_tier]

  return (
    <div className="screen stack">
      <div>
        <h1>{t('passportTitle')}</h1>
        <p style={{ color: 'var(--grey)', marginTop: 4 }}>{t('passportSub')}</p>
      </div>

      {!businessId ? (
        <DemoAiNotice />
      ) : loading ? (
        <LoadingCard />
      ) : error ? (
        <ErrorCard detail={error} onRetry={reload} />
      ) : contractMismatch ? (
        <ErrorCard
          detail="The API returned an older Passport format with no credit_risk_tier. Redeploy the backend to match this build."
          onRetry={reload}
        />
      ) : !passport ? null : (
        <>
          {/* The two numbers an underwriter looks for first. */}
          <div className="card stack" style={{ background: 'var(--purple-deep)', color: 'var(--white)', gap: 14 }}>
            <div className="row-between">
              <span className="eyebrow" style={{ color: 'var(--lavender)' }}>{data.business.name}</span>
              <span className={`chip ${TIER_CHIP[passport.credit_risk_tier]}`}>
                {lang === 'pcm' ? 'TIER ' : 'TIER '}{passport.credit_risk_tier}
              </span>
            </div>

            <div className="stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 12.5, color: 'var(--lavender)' }}>
                {lang === 'pcm' ? 'Credit limit wey we recommend' : 'Recommended credit limit'}
              </span>
              <h2 style={{ color: 'var(--white)', fontSize: 30 }}>
                {formatNaira(passport.recommended_credit_limit_ngn)}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--lavender)' }}>
                {lang === 'pcm'
                  ? `30% of ${formatNaira(passport.thirty_day_gross_revenue)} wey enter for 30 days`
                  : `30% of ${formatNaira(passport.thirty_day_gross_revenue)} gross revenue over 30 days`}
              </span>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--lavender)', margin: 0 }}>
              {lang === 'pcm' ? TIER_NOTE[passport.credit_risk_tier].pcm : TIER_NOTE[passport.credit_risk_tier].en}
            </p>
          </div>

          {/* Hard figures, straight from the transaction rows. */}
          <div className="stat-grid">
            <div className="card stat-card" style={{ ['--accent' as string]: 'var(--green)' }}>
              <span className="eyebrow">{lang === 'pcm' ? '30-day money in' : '30-day gross revenue'}</span>
              <h2 style={{ marginTop: 4 }}>{formatNaira(passport.thirty_day_gross_revenue)}</h2>
            </div>
            <div className="card stat-card" style={{ ['--accent' as string]: 'var(--purple-mid)' }}>
              <span className="eyebrow">{lang === 'pcm' ? 'Trading consistency' : 'Transaction consistency'}</span>
              <h2 style={{ marginTop: 4 }}>{passport.transaction_consistency_score}<span style={{ fontSize: 15, color: 'var(--grey)' }}>/100</span></h2>
            </div>
          </div>

          <div className="card stack" style={{ gap: 10 }}>
            <span className="eyebrow">{lang === 'pcm' ? 'Trading consistency' : 'Transaction consistency'}</span>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, passport.transaction_consistency_score))}%`,
                  background: 'var(--purple-mid)',
                }}
              />
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--grey)', margin: 0 }}>
              {lang === 'pcm'
                ? `Out of the last 30 days, sales enter for about ${Math.round(passport.transaction_consistency_score * 0.3)} days.`
                : `Around ${Math.round(passport.transaction_consistency_score * 0.3)} of the last 30 days recorded at least one sale.`}
            </p>
          </div>

          <div className="card stack" style={{ gap: 14 }}>
            <span className="eyebrow">{lang === 'pcm' ? 'Underwriting signals' : 'Underwriting signals'}</span>
            <MetricRow
              label={lang === 'pcm' ? 'Expense stability' : 'Expense stability index'}
              value={passport.expense_stability_index}
              cls={STABILITY_CHIP[passport.expense_stability_index]}
            />
            <MetricRow
              label={lang === 'pcm' ? 'Stock health' : 'Inventory health'}
              value={passport.inventory_health_status}
              cls={INVENTORY_CHIP[passport.inventory_health_status]}
            />
            <MetricRow
              label={lang === 'pcm' ? 'KYC data verified' : 'KYC data verifiability'}
              value={passport.kyc_data_verifiability ? (lang === 'pcm' ? 'Verified' : 'Verified') : (lang === 'pcm' ? 'Not verified' : 'Not verified')}
              cls={passport.kyc_data_verifiability ? 'chip-green' : 'chip-amber'}
            />
          </div>

          <p style={{ fontSize: 12, color: 'var(--grey)' }}>
            {lang === 'pcm'
              ? 'This na structured evidence of your business activity wey lender fit read — e no be automatic loan approval or credit score.'
              : 'This is a structured, consent-based view of business activity for a lender to assess — not an automatic loan approval or credit score.'}
            {' '}
            {lang === 'pcm' ? 'We calculate am' : 'Calculated'} {formatTimestamp(passport.last_calculated_at)}.
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
        </>
      )}
    </div>
  )
}
