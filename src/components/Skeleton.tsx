import type { CSSProperties } from 'react'

interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: CSSProperties
  className?: string
}

/** One pulsing placeholder block. */
export function Skeleton({ width = '100%', height = 12, radius, style, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...(radius !== undefined ? { borderRadius: radius } : null), ...style }}
      aria-hidden
    />
  )
}

/**
 * Shape-matched loading states. Each mirrors the real layout closely enough
 * that data arriving swaps content in without moving anything — the point of
 * skeletons over a spinner is that there is no reflow at the swap.
 */

/** Dashboard: dark health card (gauge + summary) then a stack of insight rows. */
export function DashboardSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading your business health">
      <div className="card health-card row" style={{ gap: 20, alignItems: 'center' }}>
        <Skeleton
          width={128}
          height={128}
          radius="50%"
          style={{ background: 'rgba(255,255,255,0.1)', flex: '0 0 auto' }}
        />
        <div className="stack" style={{ gap: 10, flex: 1 }}>
          <Skeleton width={96} height={10} style={{ background: 'rgba(255,255,255,0.14)' }} />
          <Skeleton height={13} style={{ background: 'rgba(255,255,255,0.1)' }} />
          <Skeleton width="72%" height={13} style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card row" style={{ padding: '18px 20px', gap: 12 }}>
            <Skeleton width={4} height={52} radius={4} style={{ flex: '0 0 auto' }} />
            <div className="stack" style={{ gap: 8, flex: 1 }}>
              <Skeleton width={64} height={16} radius={999} />
              <Skeleton width="82%" height={15} radius={8} />
              <Skeleton width="60%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Action Center: priority pill, heading, two reason lines, and a button. */
export function ActionsSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading your action plan">
      {[0, 1].map((i) => (
        <div key={i} className="card stack" style={{ gap: 12 }}>
          <Skeleton width={92} height={18} radius={999} />
          <Skeleton width="70%" height={17} radius={8} />
          <Skeleton height={12} />
          <Skeleton width="88%" height={12} />
          <Skeleton height={46} radius={999} style={{ marginTop: 4 }} />
        </div>
      ))}
    </div>
  )
}

/** Passport: dark hero (tier pill + credit limit), two stat cards, metric rows. */
export function PassportSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading your credit passport">
      <div className="card health-card stack" style={{ gap: 16 }}>
        <div className="row-between">
          <Skeleton width={124} height={11} style={{ background: 'rgba(255,255,255,0.14)' }} />
          <Skeleton width={62} height={22} radius={999} style={{ background: 'rgba(255,255,255,0.14)' }} />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <Skeleton width={150} height={11} style={{ background: 'rgba(255,255,255,0.12)' }} />
          <Skeleton width={210} height={32} radius={10} style={{ background: 'rgba(255,255,255,0.16)' }} />
          <Skeleton width="66%" height={11} style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>

      <div className="stat-grid">
        {[0, 1].map((i) => (
          <div key={i} className="card stat-card stack" style={{ gap: 10 }}>
            <Skeleton width="70%" height={10} />
            <Skeleton width="80%" height={24} radius={8} />
          </div>
        ))}
      </div>

      <div className="card stack" style={{ gap: 16 }}>
        <Skeleton width={130} height={10} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="row-between">
            <Skeleton width="46%" height={13} />
            <Skeleton width={80} height={22} radius={999} />
          </div>
        ))}
      </div>
    </div>
  )
}
