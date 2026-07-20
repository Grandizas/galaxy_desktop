import { AnimatePresence, motion } from 'framer-motion'

import { useUiStore } from '@/store/uiStore'

/** Transient status messages, anchored above the status bar. */
export function ToastStack() {
  const toasts = useUiStore((state) => state.toasts)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="rounded-full glass px-5 py-2 text-[12.5px] whitespace-nowrap text-content/90"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
