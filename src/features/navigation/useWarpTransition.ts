import { useCallback, useEffect, useRef } from 'react'

import { WARP } from '@/lib/constants'
import { useCameraStore, type Vec3 } from '@/store/cameraStore'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useUiStore } from '@/store/uiStore'

import { computeDivePosition } from './warpGeometry'

/**
 * Orchestrates the flight between folders:
 *
 *   dive → flash → load → emerge
 *
 * The directory read starts *during* the dive rather than after it, so the
 * flight hides the latency instead of adding to it. If the read finishes early
 * we still hold the flash briefly; if it is slow, the flash simply lasts longer.
 */
export function useWarpTransition() {
  const navigateTo = useFilesystemStore((state) => state.navigateTo)
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const reducedMotion = useUiStore((state) => state.reducedMotion)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const inFlight = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
      // Leaving mid-flight would otherwise strand the camera in `dive`.
      useCameraStore.getState().endWarp()
    }
  }, [clearTimers])

  /*
   * Arrivals that did not start with a dive — back, forward, breadcrumbs, the
   * sidebar — still get the fly-in and the staggered entrance, so no route into
   * a folder feels like a hard cut.
   */
  const previousPath = useRef(useFilesystemStore.getState().currentPath)

  useEffect(() => {
    if (currentPath === previousPath.current) return
    previousPath.current = currentPath
    if (inFlight.current || !currentPath) return

    const camera = useCameraStore.getState()
    camera.arrive()
    timers.current.push(setTimeout(() => useCameraStore.getState().endWarp(), WARP.flashMs))
  }, [currentPath])

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(setTimeout(resolve, ms))
    })

  /** Enters a folder, flying the camera into it. */
  const enterSystem = useCallback(
    async (path: string, bodyPosition?: Vec3) => {
      if (inFlight.current) return
      inFlight.current = true

      const camera = useCameraStore.getState()

      try {
        if (reducedMotion || !bodyPosition) {
          await navigateTo(path)
          camera.arrive()
          camera.endWarp()
          return
        }

        camera.beginDive(computeDivePosition(camera.position, bodyPosition), bodyPosition)

        // Load and fly at the same time; the flight covers the read.
        const [loaded] = await Promise.allSettled([navigateTo(path), wait(WARP.diveMs)])

        if (loaded.status === 'rejected') {
          camera.resetView()
          return
        }

        camera.arrive()
        await wait(WARP.flashMs)
        camera.endWarp()
      } finally {
        inFlight.current = false
      }
    },
    [navigateTo, reducedMotion],
  )

  return { enterSystem }
}
