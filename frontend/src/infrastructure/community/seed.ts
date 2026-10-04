import type { HexColor } from '../../domain/color'
import type { Shirt } from '../../domain/shirt'

const palette: HexColor[][] = [
  ['#D64545'],
  ['#3F7BE0'],
  ['#F5C451', '#14181F'],
  ['#E6E9EF', '#3F7BE0', '#D64545'],
]

export const communitySeed: Shirt[] = Array.from({ length: 30 }, (_, index) => ({
  id: `seed-shirt-${index + 1}`,
  name: `Comunidad ${index + 1}`,
  angle: (index * 37) % 360,
  textColor: index % 2 === 0 ? '#FFFFFF' : '#14181F',
  colors: palette[index % palette.length],
  createdAt: Date.UTC(2025, 0, 30 - index),
}))
