import { Html } from '@react-three/drei'

import { cn } from '@/utils/cn'

interface BodyLabelProps {
  label: string
  meta?: string
  /** Vertical offset in world units, usually just below the body. */
  offset: number
  /** Expanded hover card versus the resting one-line caption. */
  detailed?: boolean
  dimmed?: boolean
}

/**
 * Name (and on hover, metadata) anchored to a celestial body.
 *
 * Rendered through drei's `<Html>` so text stays crisp and legible at any
 * distance — SDF text in the scene would blur or z-fight at these scales.
 */
export function BodyLabel({
  label,
  meta,
  offset,
  detailed = false,
  dimmed = false,
}: BodyLabelProps) {
  return (
    <Html
      center
      distanceFactor={26}
      position={[0, -offset, 0]}
      zIndexRange={[20, 0]}
      className="pointer-events-none select-none"
    >
      <div
        className={cn(
          'text-center whitespace-nowrap transition-opacity',
          detailed && 'rounded-[10px] glass px-3 py-1.5',
        )}
        style={{ opacity: dimmed ? 0.25 : 1 }}
      >
        <div className="font-sans text-[13px] tracking-[0.08em] text-content/85">{label}</div>
        {detailed && meta && (
          <div className="mt-0.5 font-mono text-[9.5px] text-content-muted">{meta}</div>
        )}
      </div>
    </Html>
  )
}
