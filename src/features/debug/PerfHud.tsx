import { env } from '@/lib/env'
import { usePerfStore } from '@/store/perfStore'
import { cn } from '@/utils/cn'

/** Frame budget at 60fps. */
const BUDGET_MS = 16.7

/**
 * Small always-on readout, so a regression is visible while working rather than
 * discovered later. Only mounted when VITE_ENABLE_DEBUG is on.
 */
export function PerfHud() {
  const fps = usePerfStore((state) => state.fps)
  const frameMs = usePerfStore((state) => state.frameMs)
  const worstFrameMs = usePerfStore((state) => state.worstFrameMs)
  const drawCalls = usePerfStore((state) => state.drawCalls)
  const triangles = usePerfStore((state) => state.triangles)
  const bodies = usePerfStore((state) => state.bodies)

  if (!env.enableDebug || fps === 0) return null

  const healthy = frameMs <= BUDGET_MS * 1.5

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-xl glass px-3 py-2 font-mono text-[10px] leading-relaxed">
      <div className={cn('font-medium', healthy ? 'text-success' : 'text-warning')}>
        {fps} fps · {frameMs.toFixed(1)} ms peak
      </div>
      <div className="text-content-subtle">
        {drawCalls} draws · {(triangles / 1000).toFixed(0)}k tris · {bodies} bodies
      </div>
      <div className="text-content-subtle/70">worst {worstFrameMs.toFixed(0)} ms</div>
    </div>
  )
}
