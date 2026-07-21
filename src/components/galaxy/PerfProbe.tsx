import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

import { usePerfStore } from '@/store/perfStore'

/** How often to publish to the store — per-frame writes would themselves cost. */
const SAMPLE_MS = 400

/**
 * Samples renderer statistics from inside the Canvas.
 *
 * `gl.info.render` resets every frame, so draw calls and triangles are read
 * live and only the aggregate is published.
 */
export function PerfProbe({ bodies }: { bodies: number }) {
  const gl = useThree((state) => state.gl)
  const report = usePerfStore((state) => state.report)

  const frames = useRef(0)
  const elapsed = useRef(0)
  const peakMs = useRef(0)

  useFrame((_, delta) => {
    frames.current += 1
    elapsed.current += delta
    peakMs.current = Math.max(peakMs.current, delta * 1000)

    if (elapsed.current * 1000 < SAMPLE_MS) return

    const seconds = elapsed.current
    report({
      fps: Math.round(frames.current / seconds),
      // Peak, not mean: a 200ms stall matters more than a good average.
      frameMs: Number(peakMs.current.toFixed(1)),
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      programs: gl.info.programs?.length ?? 0,
      bodies,
    })

    frames.current = 0
    elapsed.current = 0
    peakMs.current = 0
  })

  return null
}
