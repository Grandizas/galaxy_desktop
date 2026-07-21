import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Keeps Tab inside a modal and restores focus when it closes.
 *
 * `aria-modal` only tells assistive tech the background is inert — it does not
 * stop Tab reaching the controls behind. Without this, a delete confirmation
 * could be left pending while the user tabs to an unrelated action underneath.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) return

    const container = ref.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      )
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]!
      const last = items[items.length - 1]!
      const current = document.activeElement
      const inside = container.contains(current)

      if (event.shiftKey && (!inside || current === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!inside || current === last)) {
        event.preventDefault()
        first.focus()
      }
    }

    // Capture phase so the trap wins over any other keydown handler.
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}
