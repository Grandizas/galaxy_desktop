import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface SearchBarProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value: string
  onValueChange: (value: string) => void
  /** Right-aligned status, e.g. "3 found". */
  hint?: ReactNode
}

export function SearchBar({
  value,
  onValueChange,
  hint,
  className,
  placeholder = 'Search this system…',
  ...props
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-full glass px-5 py-2.5 no-drag',
        'transition-colors focus-within:border-accent/40',
        className,
      )}
    >
      <MagnifierIcon />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[13.5px] text-content outline-none [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {hint && <span className="font-mono text-[10px] text-accent">{hint}</span>}
    </div>
  )
}

function MagnifierIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
    </svg>
  )
}
