import { useEffect, useRef, useState } from 'react'
import { HexColorInput, HexColorPicker } from 'react-colorful'
import { normalizeHexColor, type HexColor } from '../../domain/color'
import { strings } from '../strings'

interface ColorFieldProps {
  value: HexColor
  onChange: (value: HexColor) => void
  label: string
  hideLabel?: boolean
}

export function ColorField({ value, onChange, label, hideLabel = false }: ColorFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<HexColor>(value)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) setDraft(value)
  }, [isOpen, value])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const openPicker = () => {
    setDraft(value)
    setIsOpen(true)
  }

  const closePicker = () => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const applyColor = () => {
    const normalized = normalizeHexColor(draft)
    if (normalized) onChange(normalized)
    closePicker()
  }

  const updateDraft = (nextValue: string) => {
    const normalized = normalizeHexColor(nextValue.toUpperCase())
    if (normalized) setDraft(normalized)
  }

  return (
    <div className="color-field">
      {!hideLabel && <span className="color-field-label">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        className="color-field-trigger"
        onClick={openPicker}
        aria-label={`${label}: ${value}`}
      >
        <span className="color-swatch" style={{ backgroundColor: value }} aria-hidden="true" />
        <span>{value}</span>
      </button>
      {isOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePicker()
        }}>
          <div className="color-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="color-picker-title">
            <h2 id="color-picker-title">{strings.colorPicker.title}</h2>
            <HexColorPicker color={draft} onChange={updateDraft} />
            <label className="color-picker-hex">
              <span>{strings.colorPicker.hex}</span>
              <HexColorInput color={draft} onChange={updateDraft} prefixed aria-label={strings.colorPicker.hex} />
            </label>
            <div className="confirm-dialog-actions">
              <button type="button" className="secondary-button" onClick={closePicker}>{strings.confirm.cancel}</button>
              <button type="button" className="primary-button" onClick={applyColor}>{strings.colorPicker.apply}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
