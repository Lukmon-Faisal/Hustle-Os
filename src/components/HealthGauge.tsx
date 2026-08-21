interface Props {
  score: number
  size?: number
  dark?: boolean
}

export function HealthGauge({ score, size = 128, dark = false }: Props) {
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score))
  const offset = circumference * (1 - pct / 100)
  // The gauge sits on a near-black card, so it needs luminous values rather
  // than the palette's text-on-white greens and ambers, which read as mud here.
  const color = pct >= 75 ? '#34D399' : pct >= 55 ? 'var(--purple-glow)' : '#FBBF24'
  const trackColor = dark ? 'rgba(255,255,255,0.14)' : 'var(--grey-light)'
  const numberColor = dark ? 'var(--white)' : 'var(--ink)'
  const subColor = dark ? 'rgba(255,255,255,0.55)' : 'var(--grey)'

  return (
    <div className="gauge-wrap" style={{ width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.24, fontWeight: 700, color: numberColor }}>
          {pct}
        </span>
        <span style={{ fontSize: size * 0.08, color: subColor, fontWeight: 600 }}>/100</span>
      </div>
    </div>
  )
}
