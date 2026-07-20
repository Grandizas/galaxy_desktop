import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Rendered as a small uppercase eyebrow above the content. */
  title?: string
  actions?: ReactNode
  padded?: boolean
}

/** Frosted-glass surface. The base for every floating panel in the shell. */
export function Panel({
  title,
  actions,
  padded = true,
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-[18px] glass shadow-[0_18px_60px_-20px_rgba(0,0,0,0.9)] no-drag',
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          {title && (
            <h2 className="font-mono text-[9px] tracking-[0.22em] text-content-subtle uppercase">
              {title}
            </h2>
          )}
          {actions}
        </header>
      )}
      <div className={cn('min-h-0 flex-1 overflow-y-auto', padded && 'px-3 pb-3')}>{children}</div>
    </div>
  )
}
