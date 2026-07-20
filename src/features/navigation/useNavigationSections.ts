import { useMemo } from 'react'

import { useFilesystemStore } from '@/store/filesystemStore'
import { useUiStore } from '@/store/uiStore'
import { palette } from '@/styles/theme'
import { join } from '@/utils/path'

export type NavShape = 'folder' | 'drive' | 'network' | 'favorite'

export interface NavItem {
  id: string
  label: string
  shape: NavShape
  accent: string
  active: boolean
  onSelect: () => void
}

export interface NavSection {
  title: string
  items: NavItem[]
}

const WELL_KNOWN = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Videos', 'Music']
const FAVORITES = ['Projects', 'Pictures']

/**
 * Builds the sidebar model. Lives in `features/navigation` so the Sidebar
 * component stays purely presentational.
 */
export function useNavigationSections(): NavSection[] {
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const drives = useFilesystemStore((state) => state.drives)
  const navigateTo = useFilesystemStore((state) => state.navigateTo)
  const homePath = useFilesystemStore((state) => state.history[0] ?? null)
  const pushToast = useUiStore((state) => state.pushToast)

  return useMemo(() => {
    const item = (
      label: string,
      path: string | null,
      shape: NavShape,
      accent = 'rgba(186,210,240,.6)',
    ): NavItem => ({
      id: `${shape}:${label}`,
      label,
      shape,
      accent,
      active: path !== null && currentPath === path,
      onSelect: () => (path ? void navigateTo(path) : pushToast(`${label} is not charted yet`)),
    })

    const child = (name: string) => (homePath ? join(homePath, name) : null)

    return [
      {
        title: 'Favorites',
        items: FAVORITES.map((name) => item(name, child(name), 'favorite', palette.warning)),
      },
      {
        title: 'This PC',
        items: [
          item('Home', homePath, 'folder', palette.primarySoft),
          ...WELL_KNOWN.map((name) => item(name, child(name), 'folder')),
        ],
      },
      {
        title: 'Drives',
        items: drives.map((drive) => item(drive.label, drive.path, 'drive')),
      },
      {
        title: 'Network',
        items: [item('Network', null, 'network')],
      },
    ]
  }, [currentPath, drives, homePath, navigateTo, pushToast])
}
