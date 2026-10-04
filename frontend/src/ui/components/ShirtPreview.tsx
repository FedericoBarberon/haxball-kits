import type { CSSProperties } from 'react'
import type { Shirt } from '../../domain/shirt'

export const ANGLE_OFFSET = 90

export function toCssAngle(angle: number): number {
  return angle + ANGLE_OFFSET
}

interface ShirtPreviewProps {
  shirt: Pick<Shirt, 'angle' | 'colors' | 'textColor'>
  size: number
  className?: string
}

export function ShirtPreview({ shirt, size, className }: ShirtPreviewProps) {
  const background =
    shirt.colors.length === 1
      ? shirt.colors[0]
      : `linear-gradient(${toCssAngle(shirt.angle)}deg, ${shirt.colors
        .map((color, index) => {
          const start = (index / shirt.colors.length) * 100
          const end = ((index + 1) / shirt.colors.length) * 100
          return `${color} ${start}% ${end}%`
        })
        .join(', ')})`

  const style: CSSProperties = {
    width: size,
    height: size,
    color: shirt.textColor,
    background,
    fontSize: `${Math.max(12, size * 0.55)}px`,
  }

  return (
    <div
      className={`shirt-preview${className ? ` ${className}` : ''}`}
      style={style}
      role="img"
      aria-label="Vista previa de la camiseta"
    >
      <span aria-hidden="true">10</span>
    </div>
  )
}
