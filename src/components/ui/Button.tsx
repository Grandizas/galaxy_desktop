import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

import { cn } from '@/utils/cn'

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary/15 text-primary-soft border-primary/40 hover:bg-primary/25',
  ghost: 'bg-transparent text-content/80 border-transparent hover:bg-white/7',
  subtle: 'bg-white/5 text-content/85 border-border hover:bg-white/10',
  danger: 'bg-transparent text-danger border-transparent hover:bg-danger/15',
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-4 text-[13px] gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  /** React 19 passes refs through props — no forwardRef needed. */
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'subtle',
  size = 'md',
  icon,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-lg border tracking-wide no-drag',
        'transition-colors duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent/60',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
