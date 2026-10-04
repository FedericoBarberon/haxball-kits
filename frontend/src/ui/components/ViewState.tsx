interface ViewStateProps {
  kind: 'loading' | 'empty' | 'error'
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function ViewState({ kind, message, actionLabel, onAction }: ViewStateProps) {
  return (
    <div className={`view-state view-state-${kind}`} role={kind === 'error' ? 'alert' : undefined} aria-busy={kind === 'loading'}>
      {kind === 'loading' && <div className="skeleton-preview" aria-hidden="true" />}
      <p>{message ?? strings.viewState[kind]}</p>
      {actionLabel && onAction && (
        <button type="button" className="secondary-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
import { strings } from '../strings'
