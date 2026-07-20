import { Outlet } from 'react-router-dom'

import { GalaxyCanvas } from '@/components/galaxy/GalaxyCanvas'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { StatusBar } from '@/components/layout/StatusBar'
import { Toolbar } from '@/components/layout/Toolbar'
import { WindowLayout } from '@/components/layout/WindowLayout'
import { InspectorPanel } from '@/features/inspector/InspectorPanel'
import { useDirectory } from '@/features/filesystem/useDirectory'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useCameraStore } from '@/store/cameraStore'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSearchStore } from '@/store/searchStore'
import { useSelectionStore } from '@/store/selectionStore'

/**
 * Persistent shell. The galaxy lives here rather than inside a route so the
 * WebGL context survives navigation between Settings, About and Debug.
 */
export function AppShell() {
  useDirectory()
  usePrefersReducedMotion()

  useKeyboardShortcuts({
    escape: () => {
      useSelectionStore.getState().clear()
      useSearchStore.getState().reset()
    },
    'alt+arrowleft': () => void useFilesystemStore.getState().goBack(),
    'alt+arrowright': () => void useFilesystemStore.getState().goForward(),
    'alt+arrowup': () => void useFilesystemStore.getState().goUp(),
    'ctrl+r': () => void useFilesystemStore.getState().refresh(),
    'ctrl+0': () => useCameraStore.getState().resetView(),
  })

  return (
    <WindowLayout
      header={<Header />}
      nav={<Sidebar />}
      overlay={<Toolbar />}
      info={<InspectorPanel />}
      statusBar={<StatusBar />}
    >
      <GalaxyCanvas />

      {/* Routed pages render as overlays above the galaxy. */}
      <Outlet />
    </WindowLayout>
  )
}
