import { useCameraStore } from '@/store/cameraStore'
import { useUiStore } from '@/store/uiStore'

import { RouteOverlay } from './RouteOverlay'

/** Placeholder settings surface — wired to the stores that already exist. */
export function SettingsPage() {
  const autoRotate = useCameraStore((state) => state.autoRotate)
  const setAutoRotate = useCameraStore((state) => state.setAutoRotate)
  const driftEnabled = useCameraStore((state) => state.driftEnabled)
  const setDriftEnabled = useCameraStore((state) => state.setDriftEnabled)
  const reducedMotion = useUiStore((state) => state.reducedMotion)
  const setReducedMotion = useUiStore((state) => state.setReducedMotion)

  return (
    <RouteOverlay title="Settings" subtitle="Scene and motion preferences.">
      <div className="flex flex-col divide-y divide-border">
        <Toggle
          label="Camera drift"
          description="Slow idle sway that keeps the scene alive."
          checked={driftEnabled}
          onChange={setDriftEnabled}
        />
        <Toggle
          label="Auto-rotate"
          description="Continuously orbit the current system."
          checked={autoRotate}
          onChange={setAutoRotate}
        />
        <Toggle
          label="Reduced motion"
          description="Minimise animation. Follows your Windows preference by default."
          checked={reducedMotion}
          onChange={setReducedMotion}
        />
      </div>
    </RouteOverlay>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-3.5">
      <span>
        <span className="block text-content">{label}</span>
        <span className="mt-0.5 block text-[12px] text-content-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-primary"
      />
    </label>
  )
}
