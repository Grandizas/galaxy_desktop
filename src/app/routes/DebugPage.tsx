import { env } from '@/lib/env'
import { getFileSystemService } from '@/services/filesystem'
import { isTauri } from '@/services/platform'
import { useCameraStore } from '@/store/cameraStore'
import { useFilesystemStore } from '@/store/filesystemStore'
import { usePerfStore } from '@/store/perfStore'
import { useSelectionStore } from '@/store/selectionStore'

import { RouteOverlay } from './RouteOverlay'

/** Live view of the stores — the first place to look when something is off. */
export function DebugPage() {
  const filesystem = useFilesystemStore()
  const camera = useCameraStore()
  const selection = useSelectionStore()
  const perf = usePerfStore()

  const rows: Array<[string, unknown]> = [
    ['runtime', isTauri() ? 'tauri' : 'browser'],
    ['fs provider', `${env.fsProvider} → ${getFileSystemService().id}`],
    ['status', filesystem.status],
    ['error', filesystem.error ?? '—'],
    ['currentPath', filesystem.currentPath ?? '—'],
    ['entries', filesystem.entries.length],
    ['cached listings', filesystem.cache.size],
    ['history', `${filesystem.historyIndex + 1}/${filesystem.history.length}`],
    ['selected', [...selection.selected].join(', ') || '—'],
    ['hovered', selection.hovered ?? '—'],
    ['camera position', camera.position.join(', ')],
    ['transitioning', String(camera.isTransitioning)],
    ['star count', env.starCount],
    ['—', '—'],
    ['fps', `${perf.fps} (peak frame ${perf.frameMs.toFixed(1)} ms)`],
    ['worst frame', `${perf.worstFrameMs.toFixed(1)} ms`],
    ['draw calls', perf.drawCalls],
    ['triangles', perf.triangles.toLocaleString()],
    ['geometries', perf.geometries],
    ['textures', perf.textures],
    ['shader programs', perf.programs],
    ['rendered bodies', perf.bodies],
  ]

  return (
    <RouteOverlay title="Debug" subtitle="Runtime state snapshot.">
      <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-content-subtle">{label}</dt>
            <dd className="wrap-anywhere text-content/85">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </RouteOverlay>
  )
}
