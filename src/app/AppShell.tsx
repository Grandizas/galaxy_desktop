import { Outlet } from 'react-router-dom'

import { GalaxyCanvas } from '@/components/galaxy/GalaxyCanvas'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { StatusBar } from '@/components/layout/StatusBar'
import { Toolbar } from '@/components/layout/Toolbar'
import { WindowLayout } from '@/components/layout/WindowLayout'
import { PerfHud } from '@/features/debug/PerfHud'
import { ExplorerOverlays } from '@/features/explorer/ExplorerOverlays'
import { NewFolderButton } from '@/features/explorer/NewFolderButton'
import { InspectorPanel } from '@/features/inspector/InspectorPanel'
import { useDirectory } from '@/features/filesystem/useDirectory'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useCameraStore } from '@/store/cameraStore'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSearchStore } from '@/store/searchStore'
import { selectPrimarySelection, useSelectionStore } from '@/store/selectionStore'
import { useUiStore } from '@/store/uiStore'

/**
 * Persistent shell. The galaxy lives here rather than inside a route so the
 * WebGL context survives navigation between Settings, About and Debug.
 */
export function AppShell() {
  useDirectory()
  usePrefersReducedMotion()

  useKeyboardShortcuts({
    escape: () => {
      useUiStore.getState().closeContextMenu()
      useUiStore.getState().requestDeletion(null)
      useSelectionStore.getState().clear()
      useSearchStore.getState().reset()
    },
    f2: () => {
      const target = selectPrimarySelection(useSelectionStore.getState())
      if (target) useUiStore.getState().startRename(target)
    },
    delete: () => {
      const { selected } = useSelectionStore.getState()
      if (selected.size > 0) useUiStore.getState().requestDeletion([...selected])
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
      actions={<NewFolderButton />}
      statusBar={<StatusBar />}
    >
      <GalaxyCanvas />

      {/* Context menu and delete confirmation. */}
      <ExplorerOverlays />
      <PerfHud />

      {/* Routed pages render as overlays above the galaxy. */}
      <Outlet />
    </WindowLayout>
  )
}
