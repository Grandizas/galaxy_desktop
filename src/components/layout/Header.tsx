import { NavLink } from 'react-router-dom'

import { env } from '@/lib/env'
import { ROUTES } from '@/lib/constants'
import { windowControls } from '@/services/platform'
import { cn } from '@/utils/cn'

const NAV_LINKS = [
  { to: ROUTES.galaxy, label: 'Galaxy' },
  { to: ROUTES.settings, label: 'Settings' },
  { to: ROUTES.about, label: 'About' },
  ...(env.enableDebug ? [{ to: ROUTES.debug, label: 'Debug' }] : []),
]

/** Custom title bar: branding, routes, and the Windows window controls. */
export function Header() {
  return (
    <header className="z-30 flex h-header shrink-0 items-center justify-between border-b border-border/60 bg-surface/40 pl-4 backdrop-blur-xl drag-region">
      <div className="flex items-center gap-3">
        <div className="size-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#bae6fd,#38bdf8_55%,#0c4a6e)]" />
        <span className="text-xs tracking-[0.12em] text-content/60 uppercase">Galaxy</span>
        <span className="text-xs text-content-subtle">{env.appName.replace(/^Galaxy\s*/, '')}</span>

        <nav className="ml-4 flex items-center gap-1 no-drag">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-1 text-[11px] tracking-[0.08em] transition-colors',
                  isActive
                    ? 'bg-white/10 text-content'
                    : 'text-content-subtle hover:text-content/80',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex no-drag">
        <WindowButton label="Minimise" onClick={windowControls.minimize}>
          &#x2500;
        </WindowButton>
        <WindowButton label="Maximise" onClick={windowControls.toggleMaximize}>
          &#x25A2;
        </WindowButton>
        <WindowButton label="Close" onClick={windowControls.close} danger>
          &#x2715;
        </WindowButton>
      </div>
    </header>
  )
}

function WindowButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid h-header w-[46px] place-items-center text-[13px] text-content/55 transition-colors',
        danger ? 'hover:bg-danger/80 hover:text-white' : 'hover:bg-white/6',
      )}
    >
      {children}
    </button>
  )
}
