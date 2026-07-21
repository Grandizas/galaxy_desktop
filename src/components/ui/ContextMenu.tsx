import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@/utils/cn'

export interface MenuItem {
  label: string
  onSelect: () => void
  /** Destructive actions are tinted and separated from the rest. */
  danger?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

/** Floating action menu anchored to a click, kept inside the viewport. */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

  // Flip rather than overflow when the click lands near an edge.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const { width, height } = element.getBoundingClientRect()
    setPosition({
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    })
  }, [x, y])

  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()

    // `capture` so the menu closes before the click reaches the scene.
    window.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-44 rounded-xl glass p-1.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => (
        <div key={item.label}>
          {item.danger && index > 0 && <div className="my-1 h-px bg-border" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect()
              onClose()
            }}
            className={cn(
              'w-full rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors',
              'disabled:pointer-events-none disabled:opacity-35',
              item.danger
                ? 'text-danger hover:bg-danger/15'
                : 'text-content/85 hover:bg-white/8 hover:text-content',
            )}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  )
}
