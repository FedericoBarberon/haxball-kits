import { useEffect } from 'react'

interface ToastProps {
  message: string | null
  onDismiss?: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message || !onDismiss) return

    const timeout = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timeout)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="toast-dismiss" aria-label="Cerrar mensaje" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  )
}
