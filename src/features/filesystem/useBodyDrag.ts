import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'

import { useDragStore } from '@/store/dragStore'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useUiStore } from '@/store/uiStore'
import type { FsEntry } from '@/types'
import { basename } from '@/utils/path'

/** Pixels the pointer must travel before a press becomes a drag, not a click. */
const DRAG_THRESHOLD = 6

/**
 * Turns a press-and-move on a celestial body into a move operation.
 *
 * Must be used inside the Canvas — it reaches for the R3F `controls` to suspend
 * orbiting while a body is being dragged, imperatively so the very first
 * pointer-move cannot leak into a camera rotation.
 *
 * A press that never crosses the threshold is left alone, so the existing
 * click-to-select still works; only a genuine drag begins a move.
 */
export function useBodyDrag() {
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null

  const moveEntries = useFilesystemStore((state) => state.moveEntries)
  const pushToast = useUiStore((state) => state.pushToast)
  const begin = useDragStore((state) => state.begin)
  const end = useDragStore((state) => state.end)

  // All mutable gesture state lives in a ref — none of it should re-render.
  const pending = useRef<{
    entry: FsEntry
    startX: number
    startY: number
    dragging: boolean
  } | null>(null)
  /** Set when a drag ends, so the click R3F fires next is swallowed. */
  const justDragged = useRef(false)

  /**
   * Ends the gesture. `commit` is true only on pointerup — pointercancel is an
   * aborted gesture (the OS took over, the window blurred) and must never move
   * anything, just clean up.
   */
  const settle = useCallback(
    (commit: boolean) => {
      const target = useDragStore.getState().dropTarget
      const dragged = pending.current

      if (controls) controls.enabled = true
      justDragged.current = dragged?.dragging ?? false
      pending.current = null
      end()

      if (!commit || !dragged?.dragging || !target) return

      void moveEntries([dragged.entry.path], target).then((ok) => {
        if (ok) pushToast(`Moved "${basename(dragged.entry.path)}" here`)
        else pushToast(useFilesystemStore.getState().error ?? 'Could not move')
      })
    },
    [controls, end, moveEntries, pushToast],
  )

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const state = pending.current
      if (!state || state.dragging) return

      const moved = Math.hypot(event.clientX - state.startX, event.clientY - state.startY)
      if (moved < DRAG_THRESHOLD) return

      state.dragging = true
      begin(state.entry)
    }
    const onUp = () => settle(true)
    const onCancel = () => settle(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [begin, settle])

  /** Attach to a body's onPointerDown. */
  const onBodyPointerDown = useCallback(
    (entry: FsEntry, clientX: number, clientY: number) => {
      pending.current = { entry, startX: clientX, startY: clientY, dragging: false }
      // Suspend orbiting immediately — a React state toggle would race the
      // pointer-move that OrbitControls has already begun tracking.
      if (controls) controls.enabled = false
    },
    [controls],
  )

  /**
   * True if the click now firing is the tail of a drag — call from a body's
   * onClick and bail when it returns true. Consumes the flag.
   */
  const consumeDragClick = useCallback(() => {
    if (!justDragged.current) return false
    justDragged.current = false
    return true
  }, [])

  return { onBodyPointerDown, consumeDragClick }
}
