import { useMemo, useState } from 'react'
import { buildColorsCommand } from '../../domain/haxballCommand'
import { normalizeHexColor, type HexColor } from '../../domain/color'
import { validateNewShirt, type NewShirt } from '../../domain/shirt'
import { ShirtPreview } from '../components/ShirtPreview'
import { ColorField } from '../components/ColorField'
import { strings } from '../strings'

interface CreateViewProps {
  onSave: (input: NewShirt, publish: boolean) => Promise<void>
}

interface FormState {
  name: string
  angle: number
  textColor: string
  colors: string[]
}

const initialForm: FormState = {
  name: '',
  angle: 0,
  textColor: '#FFFFFF',
  colors: ['#D64545'],
}

export function CreateView({ onSave }: CreateViewProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [publish, setPublish] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const validationInput: NewShirt = {
    ...form,
    textColor: normalizeHexColor(form.textColor) ?? '#INVALID' as HexColor,
    colors: form.colors.map((color) => normalizeHexColor(color) ?? '#INVALID' as HexColor),
  }
  const validation = useMemo(() => validateNewShirt(validationInput), [validationInput])
  const command = useMemo(() => {
    try {
      return buildColorsCommand({ ...validationInput, id: 'preview', createdAt: 0 }, 'red')
    } catch {
      return ''
    }
  }, [validationInput])

  const updateColor = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, colorIndex) => colorIndex === index ? value.toUpperCase() : color),
    }))
  }

  const updateTextColor = (value: string) => {
    const normalized = normalizeHexColor(value)
    setForm((current) => ({ ...current, textColor: normalized ?? value.toUpperCase() }))
  }

  const save = async () => {
    if (!validation.valid) return
    setSubmitting(true)
    try {
      await onSave(validationInput, publish)
      setForm(initialForm)
      setPublish(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="create-view">
      <div className="create-scroll">
        <div className="create-preview">
          <ShirtPreview shirt={validationInput} size={120} />
        </div>

        <label className="form-field">
          <span>{strings.create.name}</span>
          <input
            type="text"
            value={form.name}
            placeholder='Haxball Casacas'
            maxLength={24}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            aria-invalid={Boolean(validation.errors.name)}
          />
          <small>{form.name.length}/24</small>
          {validation.errors.name && <em>{strings.create.errors.name}</em>}
        </label>

        <div className="form-field">
          <span>{strings.create.angle}</span>
          <div className="angle-controls">
            <input
              type="range"
              min="0"
              max="359"
              value={form.angle}
              onChange={(event) => setForm((current) => ({ ...current, angle: Number(event.target.value) }))}
              aria-label={strings.create.angle}
            />
            <input
              type="number"
              min="0"
              max="359"
              value={form.angle}
              onChange={(event) => setForm((current) => ({ ...current, angle: Number(event.target.value) }))}
              aria-label={strings.create.angleValue}
            />
          </div>
          {validation.errors.angle && <em>{strings.create.errors.angle}</em>}
        </div>

        <div className="form-field">
          <ColorField value={normalizeHexColor(form.textColor) ?? '#FFFFFF'} onChange={updateTextColor} label={strings.create.textColor} />
          {validation.errors.textColor && <em>{strings.create.errors.textColor}</em>}
        </div>

        <fieldset className="form-field colors-field">
          <legend>{strings.create.shirtColors}</legend>
          {form.colors.map((color, index) => (
            <div className="shirt-color-row" key={index}>
              <span className="color-field-label">{`${strings.create.color} ${index + 1}`}</span>
              <div className="shirt-color-actions">
                <ColorField hideLabel value={normalizeHexColor(color) ?? '#FFFFFF'} onChange={(value) => updateColor(index, value)} label={`${strings.create.color} ${index + 1}`} />
                <button type="button" className="remove-color-button" aria-label={strings.create.removeColor} disabled={form.colors.length === 1} onClick={() => setForm((current) => ({ ...current, colors: current.colors.filter((_, colorIndex) => colorIndex !== index) }))}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 7h14M10 11v6M14 11v6M9 7l1-2h4l1 2m-8 0 1 13h8l1-13" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {form.colors.length < 3 && (
            <button type="button" className="secondary-button add-color-button" onClick={() => setForm((current) => ({ ...current, colors: [...current.colors, '#FFFFFF'] }))}>
              {strings.create.addColor}
            </button>
          )}
          {validation.errors.colors && <em>{strings.create.errors.colors}</em>}
        </fieldset>

        <code className="command-preview">{command}</code>

        <label className="switch-field">
          <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />
          <span>{strings.create.publish}</span>
        </label>
      </div>
      <button type="button" className="primary-button" disabled={!validation.valid || submitting} onClick={() => void save()}>
        {submitting ? strings.create.saving : strings.create.save}
      </button>
    </div>
  )
}
