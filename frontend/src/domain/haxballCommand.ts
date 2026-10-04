import type { Shirt, Team } from './shirt'
import { hexToCommand } from './color'

export function buildColorsCommand(shirt: Shirt, team: Team): string {
  const colors = shirt.colors.map(hexToCommand).join(' ')
  return `/colors ${team} ${shirt.angle} ${hexToCommand(shirt.textColor)} ${colors}`
}
