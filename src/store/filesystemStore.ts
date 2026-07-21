import { create } from 'zustand'

import { getFileSystemService } from '@/services/filesystem'
import type { DirectoryListing, DriveInfo, FsEntry } from '@/types'
import { FsError } from '@/types'
import { basename, dirname, normalizePath } from '@/utils/path'

/**
 * How many directories to probe for child counts per navigation. A folder with
 * thousands of subdirectories would otherwise issue thousands of reads for
 * decoration alone.
 */
const CHILD_COUNT_LIMIT = 200

/** OS errors are unreadable; the status bar shows people-facing copy. */
function toMessage(error: unknown): string {
  if (error instanceof FsError) {
    const name = error.path ? basename(error.path) : 'that folder'
    switch (error.code) {
      case 'permission-denied':
        return `Windows denied access to ${name}`
      case 'not-found':
        return `${name} no longer exists`
      case 'unsupported':
        return `${name} cannot be opened as a folder`
      default:
        return `Could not read ${name}`
    }
  }
  return error instanceof Error ? error.message : String(error)
}

interface FilesystemState {
  /** Directory currently rendered as a solar system. */
  currentPath: string | null
  /** The user's home directory, resolved once at startup. */
  homePath: string | null
  entries: readonly FsEntry[]
  drives: readonly DriveInfo[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  /** Back/forward stacks — the navigation feature drives these. */
  history: string[]
  historyIndex: number
  /** Listings kept around so re-entering a folder is instant. */
  cache: Map<string, DirectoryListing>
}

interface FilesystemActions {
  initialize: () => Promise<void>
  navigateTo: (path: string, options?: { replaceHistory?: boolean }) => Promise<void>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  goUp: () => Promise<void>
  refresh: () => Promise<void>
  /** Backfills `childCount` for the directories in the current listing. */
  enrichChildCounts: (path: string) => Promise<void>
}

export type FilesystemStore = FilesystemState & FilesystemActions

export const useFilesystemStore = create<FilesystemStore>((set, get) => ({
  currentPath: null,
  homePath: null,
  entries: [],
  drives: [],
  status: 'idle',
  error: null,
  history: [],
  historyIndex: -1,
  cache: new Map(),

  async initialize() {
    const fs = getFileSystemService()
    const [home, drives] = await Promise.all([fs.getHomePath(), fs.listDrives()])
    set({ drives, homePath: normalizePath(home) })
    await get().navigateTo(home)
  },

  async navigateTo(path, options) {
    const { cache, history, historyIndex, currentPath } = get()
    if (path === currentPath && get().status === 'ready') return

    const cached = cache.get(path)
    set({ status: cached ? 'ready' : 'loading', error: null })
    if (cached) set({ currentPath: path, entries: cached.entries })

    try {
      const listing = await getFileSystemService().listDirectory(path)
      cache.set(listing.path, listing)

      const nextHistory = options?.replaceHistory
        ? history
        : [...history.slice(0, historyIndex + 1), listing.path]

      set({
        currentPath: listing.path,
        entries: listing.entries,
        status: 'ready',
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      })

      // Fire and forget: satellites pop in once the counts land.
      void get().enrichChildCounts(listing.path)
    } catch (error) {
      set({ status: 'error', error: toMessage(error) })
    }
  },

  async enrichChildCounts(path) {
    const directories = get()
      .entries.filter((entry) => entry.isDirectory && entry.childCount === undefined)
      .slice(0, CHILD_COUNT_LIMIT)
      .map((entry) => entry.path)

    if (directories.length === 0) return

    try {
      const counts = await getFileSystemService().countChildren(directories)

      // The user may have navigated away while this was in flight.
      if (get().currentPath !== path) return

      const entries = get().entries.map((entry) =>
        counts[entry.path] === undefined ? entry : { ...entry, childCount: counts[entry.path] },
      )
      set({ entries })

      const cached = get().cache.get(path)
      if (cached) get().cache.set(path, { ...cached, entries })
    } catch {
      // Satellites are decorative — a failed count must never break navigation.
    }
  },

  async goBack() {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    set({ historyIndex: historyIndex - 1 })
    await get().navigateTo(history[historyIndex - 1]!, { replaceHistory: true })
  },

  async goForward() {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    set({ historyIndex: historyIndex + 1 })
    await get().navigateTo(history[historyIndex + 1]!, { replaceHistory: true })
  },

  async goUp() {
    const parent = get().currentPath && dirname(get().currentPath!)
    if (parent) await get().navigateTo(parent)
  },

  async refresh() {
    const { currentPath, cache } = get()
    if (!currentPath) return
    cache.delete(currentPath)
    await get().navigateTo(currentPath, { replaceHistory: true })
  },
}))

/*
 * Derived selectors — every one returns a primitive.
 * A selector that builds a new array/object on each call re-renders forever
 * under `useSyncExternalStore`; derive collections with `useMemo` instead.
 */
export const selectFolderCount = (state: FilesystemStore) =>
  state.entries.reduce((count, entry) => count + (entry.isDirectory ? 1 : 0), 0)
export const selectFileCount = (state: FilesystemStore) =>
  state.entries.reduce((count, entry) => count + (entry.isDirectory ? 0 : 1), 0)
export const selectCanGoBack = (state: FilesystemStore) => state.historyIndex > 0
export const selectCanGoForward = (state: FilesystemStore) =>
  state.historyIndex < state.history.length - 1
