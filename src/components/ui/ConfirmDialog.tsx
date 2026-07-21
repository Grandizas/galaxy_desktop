import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation. Focus lands on **Cancel**, not the destructive action, so
 * a stray Enter keypress can never delete anything.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-[2px]"
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal
            aria-label={title}
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="w-[420px] rounded-[18px] glass p-6 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.95)]"
          >
            <h2 className="text-[16px] font-medium">{title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-content-muted">{description}</p>

            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelRef} variant="subtle" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant={danger ? 'danger' : 'primary'}
                size="sm"
                onClick={onConfirm}
                className={danger ? 'border-danger/40 bg-danger/15' : undefined}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
