import { describe, expect, it } from 'vitest'
import { buildColorsCommand } from './haxballCommand'
import type { Shirt } from './shirt'

const shirt: Shirt = {
  id: 'shirt-1',
  name: 'Test',
  angle: 45,
  textColor: '#000000',
  colors: ['#FFFFFF', '#FF0000'],
  createdAt: 0,
}

describe('buildColorsCommand', () => {
  it('builds a command with one color', () => {
    expect(buildColorsCommand({ ...shirt, angle: 0, colors: ['#FFFFFF'], textColor: '#FF0000' }, 'red'))
      .toBe('/colors red 0 FF0000 FFFFFF')
  })

  it('builds a command with two colors', () => {
    expect(buildColorsCommand(shirt, 'red')).toBe('/colors red 45 000000 FFFFFF FF0000')
  })

  it('builds a command with three colors', () => {
    expect(buildColorsCommand({ ...shirt, angle: 60, textColor: '#FFFFFF', colors: ['#0080FF', '#004077', '#002033'] }, 'red'))
      .toBe('/colors red 60 FFFFFF 0080FF 004077 002033')
  })
})
