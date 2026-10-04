export type HexColor = `#${string}`

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/

export function isHexColor(value: string): value is HexColor {
  return HEX_COLOR_PATTERN.test(value)
}

export function hexToCommand(value: HexColor): string {
  return value.slice(1)
}

export function normalizeHexColor(value: string): HexColor | null {
  const normalized = value.trim().toUpperCase()
  return isHexColor(normalized) ? normalized : null
}

export interface HslColor {
  hue: number
  saturation: number
  lightness: number
}

export function hexToRgb(value: HexColor): [number, number, number] {
  const normalized = value.slice(1)
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}

export function hexToHsl(value: HexColor): HslColor {
  const [red, green, blue] = hexToRgb(value).map((channel) => channel / 255)
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const lightness = (maximum + minimum) / 2
  const difference = maximum - minimum

  if (difference === 0) return { hue: 0, saturation: 0, lightness }

  const saturation = difference / (1 - Math.abs(2 * lightness - 1))
  let hue = 0
  if (maximum === red) hue = 60 * (((green - blue) / difference) % 6)
  else if (maximum === green) hue = 60 * ((blue - red) / difference + 2)
  else hue = 60 * ((red - green) / difference + 4)

  return { hue: hue < 0 ? hue + 360 : hue, saturation, lightness }
}

export function hslToHex({ hue, saturation, lightness }: HslColor): HexColor {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const hueSection = hue / 60
  const secondComponent = chroma * (1 - Math.abs((hueSection % 2) - 1))
  const [red, green, blue] = hueSection < 1
    ? [chroma, secondComponent, 0]
    : hueSection < 2
      ? [secondComponent, chroma, 0]
      : hueSection < 3
        ? [0, chroma, secondComponent]
        : hueSection < 4
          ? [0, secondComponent, chroma]
          : hueSection < 5
            ? [secondComponent, 0, chroma]
            : [chroma, 0, secondComponent]
  const match = lightness - chroma / 2
  const toByte = (channel: number) => Math.round((channel + match) * 255)
  return `#${[red, green, blue].map(toByte).map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}` as HexColor
}
