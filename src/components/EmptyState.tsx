import { Inbox } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { TranslationKey } from '../i18n/translations'

interface Props {
  titleKey: TranslationKey
  subKey: TranslationKey
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ titleKey, subKey, actionLabel, onAction }: Props) {
  const { t } = useApp()
  return (
    <div className="card empty-state stack" style={{ alignItems: 'center', gap: 12 }}>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'var(--lavender)',
          color: 'var(--purple-mid)',
        }}
      >
        <Inbox size={24} />
      </span>
      <h3>{t(titleKey)}</h3>
      <p style={{ fontSize: 13.5, maxWidth: 300 }}>{t(subKey)}</p>
      {onAction && actionLabel && (
        <button className="btn-primary" style={{ marginTop: 6, width: 'auto', paddingInline: 28 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
