import { useEffect } from 'react'

type Handler = (event: KeyboardEvent) => void

/**
 * Registers global shortcuts. Keys are matched case-insensitively and prefixed
 * with modifiers, e.g. `ctrl+f`, `alt+ArrowLeft`, `Escape`.
 */
export function useKeyboardShortcuts(bindings: Record<string, Handler>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.isContentEditable

      const combo = [
        event.ctrlKey && 'ctrl',
        event.altKey && 'alt',
        event.shiftKey && 'shift',
        event.key,
      ]
        .filter(Boolean)
        .join('+')
        .toLowerCase()

      const handler = bindings[combo]
      if (!handler) return
      if (isTyping && combo !== 'escape') return

      event.preventDefault()
      handler(event)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings])
}
