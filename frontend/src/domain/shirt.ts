import { isHexColor, type HexColor } from './color'

export type Team = 'red' | 'blue'

export interface Shirt {
  id: string
  name: string
  angle: number
  textColor: HexColor
  colors: HexColor[]
  createdAt: number
}

export interface OwnShirt extends Shirt {
  published: boolean
  ownerToken?: string
}

export type NewShirt = Omit<Shirt, 'id' | 'createdAt'>

export interface ValidationResult {
  valid: boolean
  errors: Partial<Record<keyof NewShirt, string>>
}

export function validateNewShirt(shirt: NewShirt): ValidationResult {
  const errors: ValidationResult['errors'] = {}
  const trimmedName = shirt.name.trim()

  if (trimmedName.length < 1 || trimmedName.length > 24 || trimmedName !== shirt.name) {
    errors.name = 'Name must contain 1 to 24 characters without surrounding spaces.'
  }
  if (!Number.isInteger(shirt.angle) || shirt.angle < 0 || shirt.angle > 359) {
    errors.angle = 'Angle must be an integer between 0 and 359.'
  }
  if (!isHexColor(shirt.textColor)) {
    errors.textColor = 'Text color must be an uppercase six-digit hex color.'
  }
  if (shirt.colors.length < 1 || shirt.colors.length > 3) {
    errors.colors = 'A shirt must have between 1 and 3 colors.'
  } else if (shirt.colors.some((color) => !isHexColor(color))) {
    errors.colors = 'Shirt colors must be uppercase six-digit hex colors.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateShirt(shirt: Shirt): ValidationResult {
  const result = validateNewShirt(shirt)
  if (!shirt.id) {
    return { ...result, valid: false, errors: { ...result.errors, name: result.errors.name ?? 'Shirt id is required.' } }
  }
  return result
}
