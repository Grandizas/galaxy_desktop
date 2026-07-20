import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

interface RouteOverlayProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Shared frame for the secondary pages, floated over the galaxy. */
export function RouteOverlay({ title, subtitle, children }: RouteOverlayProps) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 grid place-items-center bg-background/45 backdrop-blur-[2px]"
    >
      <Panel className="max-h-[70vh] w-[560px]" padded={false}>
        <div className="flex items-start justify-between gap-6 px-6 pt-6">
          <div>
            <h1 className="text-lg font-medium tracking-[0.04em]">{title}</h1>
            {subtitle && <p className="mt-1 text-[13px] text-content-muted">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.galaxy)}>
            Close
          </Button>
        </div>
        <div className="px-6 pt-5 pb-6 text-[13px] text-content/80">{children}</div>
      </Panel>
    </motion.div>
  )
}
