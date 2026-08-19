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
    <div className="card empty-state stack" style={{ alignItems: 'center' }}>
      <div aria-hidden style={{ fontSize: 32 }}>🗂️</div>
      <h3>{t(titleKey)}</h3>
      <p style={{ fontSize: 13.5 }}>{t(subKey)}</p>
      {onAction && actionLabel && (
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
