import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface ListItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  active?: boolean
  trailing?: ReactNode
}

/** One row in a sidebar or dropdown. */
export function ListItem({
  icon,
  active = false,
  trailing,
  className,
  children,
  ...props
}: ListItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-[13px] no-drag',
        'text-content/85 transition-colors duration-200 hover:bg-white/8',
        'outline-none focus-visible:ring-1 focus-visible:ring-accent/50',
        active && 'bg-primary/12 text-content',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {trailing}
    </button>
  )
}
