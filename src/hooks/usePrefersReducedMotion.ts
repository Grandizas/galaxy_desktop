import { useEffect } from 'react'

import { useUiStore } from '@/store/uiStore'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Mirrors the OS motion preference into the UI store. */
export function usePrefersReducedMotion() {
  const setReducedMotion = useUiStore((state) => state.setReducedMotion)
  const reducedMotion = useUiStore((state) => state.reducedMotion)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    setReducedMotion(media.matches)

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [setReducedMotion])

  return reducedMotion
}
