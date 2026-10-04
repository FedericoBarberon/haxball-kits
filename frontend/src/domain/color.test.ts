import { describe, expect, it } from 'vitest'
import { hexToCommand, hexToHsl, hslToHex, isHexColor, normalizeHexColor } from './color'

describe('color utilities', () => {
  it('accepts uppercase six-digit hex colors', () => {
    expect(isHexColor('#FF0080')).toBe(true)
    expect(isHexColor('#ff0080')).toBe(false)
  })

  it('normalizes editable color input', () => {
    expect(normalizeHexColor(' #ff0080 ')).toBe('#FF0080')
    expect(normalizeHexColor('#12345')).toBeNull()
  })

  it('removes the hash for Haxball commands', () => {
    expect(hexToCommand('#00A1FF')).toBe('00A1FF')
  })

  it('round-trips common colors through HSL', () => {
    expect(hslToHex(hexToHsl('#FF0080'))).toBe('#FF0080')
    expect(hslToHex(hexToHsl('#00A1FF'))).toBe('#00A1FF')
  })
})
