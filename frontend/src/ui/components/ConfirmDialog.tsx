import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-describedby="confirm-message">
        <p id="confirm-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>{cancelLabel}</button>
          <button ref={confirmRef} type="button" className="primary-button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
