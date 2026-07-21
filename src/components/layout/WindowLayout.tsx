import type { ReactNode } from 'react'

import { ToastStack } from '@/components/ui/Toast'
import { cn } from '@/utils/cn'

interface WindowLayoutProps {
  header: ReactNode
  /** Left navigation rail — floats over the stage. */
  nav?: ReactNode
  /** The main stage; the galaxy canvas fills it edge to edge. */
  children: ReactNode
  /** Right-hand contextual panel. */
  info?: ReactNode
  /** Centred overlay: breadcrumbs, search, anything else chrome-like. */
  overlay?: ReactNode
  /** Bottom-right actions, e.g. New folder. */
  actions?: ReactNode
  statusBar: ReactNode
  className?: string
}

/**
 * The application shell.
 *
 *  +-------------------------------------------+
 *  | Header                                    |
 *  +------+---------------------------+--------+
 *  | Nav  |        Galaxy stage       |  Info  |
 *  +------+---------------------------+--------+
 *  | Status bar                                |
 *  +-------------------------------------------+
 *
 * Nav and Info float above the stage rather than clipping it, so the galaxy
 * always reads as one continuous space.
 */
export function WindowLayout({
  header,
  nav,
  children,
  info,
  overlay,
  actions,
  statusBar,
  className,
}: WindowLayoutProps) {
  return (
    <div className={cn('flex h-full w-full flex-col overflow-hidden bg-background', className)}>
      {header}

      <main className="relative min-h-0 flex-1">
        {children}

        {nav && <div className="absolute top-4 bottom-4 left-4 z-10 w-sidebar">{nav}</div>}

        {overlay && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex flex-col items-center gap-3">
            {overlay}
          </div>
        )}

        {info && <div className="absolute top-4 right-4 z-20 w-inspector">{info}</div>}

        {actions && <div className="absolute right-6 bottom-6 z-20 flex gap-2">{actions}</div>}

        <ToastStack />
      </main>

      {statusBar}
    </div>
  )
}
