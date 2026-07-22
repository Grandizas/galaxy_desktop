import { create } from 'zustand'

import { getFileSystemService } from '@/services/filesystem'
import { useSearchStore } from '@/store/searchStore'
import { useSelectionStore } from '@/store/selectionStore'
import type { DirectoryListing, DriveInfo, FsEntry } from '@/types'
import { FsError } from '@/types'
import { byRecency, mergeChildCounts } from '@/utils/entries'
import { basename, dirname, normalizePath } from '@/utils/path'

/**
 * How many directories to probe for child counts per navigation. A folder with
 * thousands of subdirectories would otherwise issue thousands of reads for
 * decoration alone.
 */
const CHILD_COUNT_LIMIT = 200

/**
 * Raw OS errors ("os error 5") are unreadable, so those two codes get
 * people-facing copy. Everything else already carries a message written for
 * humans by our own backend — "New World already exists here" is far more
 * useful than anything a generic translation could produce.
 */
function toMessage(error: unknown): string {
  if (error instanceof FsError) {
    const name = error.path ? basename(error.path) : 'that folder'
    switch (error.code) {
      case 'permission-denied':
        return `Windows denied access to ${name}`
      case 'not-found':
        return error.message.includes('os error') ? `${name} no longer exists` : error.message
      default:
        return error.message
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
  /**
   * Resolves `true` when the directory was read, `false` when it failed.
   * Errors are caught and surfaced through `status`/`error` rather than thrown,
   * so callers that care about the outcome must check the return value.
   */
  navigateTo: (
    path: string,
    options?: { replaceHistory?: boolean; force?: boolean },
  ) => Promise<boolean>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  goUp: () => Promise<void>
  refresh: () => Promise<void>
  /** Backfills `childCount` for the directories in the current listing. */
  enrichChildCounts: (path: string) => Promise<void>

  /* Mutations. Each returns the affected entry, or null when it failed —
   * the error is surfaced through `error` exactly like a failed navigation. */
  createFolder: (name: string) => Promise<FsEntry | null>
  renameEntry: (path: string, newName: string) => Promise<FsEntry | null>
  deleteEntries: (paths: readonly string[]) => Promise<boolean>
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
    const { cache, history, historyIndex, currentPath, entries } = get()
    // `force` exists for refresh: re-entering the directory you are already in
    // must still re-read it, or a newly created folder never appears.
    if (!options?.force && path === currentPath && get().status === 'ready') return true

    // A new directory invalidates the previous folder's selection and any active
    // search. Done here — not in a React effect — so it happens *before* this
    // promise resolves; a caller that selects afterwards (e.g. opening a search
    // result) then wins deterministically instead of racing an effect.
    useSelectionStore.getState().clear()
    useSearchStore.getState().reset()

    // Kept so the optimistic jump below can be undone if the read fails.
    const previous = { currentPath, entries }

    const cached = cache.get(path)
    set({ status: cached ? 'ready' : 'loading', error: null })
    // Show the cached listing immediately, then revalidate.
    if (cached) set({ currentPath: path, entries: cached.entries })

    try {
      const fetched = await getFileSystemService().listDirectory(path)

      // Carry known child counts across, or satellites blink out on revisit.
      const listing: DirectoryListing = {
        ...fetched,
        entries: cached ? mergeChildCounts(fetched.entries, cached.entries) : fetched.entries,
      }
      cache.set(listing.path, listing)

      /*
       * `replaceHistory` means the caller owns the pointer — back, forward and
       * refresh move within the existing history rather than extending it.
       * Writing `historyIndex` here would snap it to the end of the stack and
       * break the second press of Back.
       */
      set(
        options?.replaceHistory
          ? { currentPath: listing.path, entries: listing.entries, status: 'ready' }
          : (() => {
              const nextHistory = [...history.slice(0, historyIndex + 1), listing.path]
              return {
                currentPath: listing.path,
                entries: listing.entries,
                status: 'ready',
                history: nextHistory,
                historyIndex: nextHistory.length - 1,
              }
            })(),
      )

      // Fire and forget: satellites pop in once the counts land.
      void get().enrichChildCounts(listing.path)
      return true
    } catch (error) {
      // A failed navigation leaves the user exactly where they were — including
      // undoing the optimistic jump into a cached listing that no longer exists.
      set({
        status: 'error',
        error: toMessage(error),
        currentPath: previous.currentPath,
        entries: previous.entries,
      })
      return false
    }
  },

  async enrichChildCounts(path) {
    // Same ordering the renderer uses to pick its planets, so the directories
    // we enrich are the ones actually on screen.
    const directories = byRecency(
      get().entries.filter((entry) => entry.isDirectory && entry.childCount === undefined),
      CHILD_COUNT_LIMIT,
    ).map((entry) => entry.path)

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

  // The pointer moves only once the directory has actually loaded, so a failed
  // step leaves history and the visible folder in agreement.
  async goBack() {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return

    if (await get().navigateTo(history[historyIndex - 1]!, { replaceHistory: true })) {
      set({ historyIndex: historyIndex - 1 })
    }
  },

  async goForward() {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return

    if (await get().navigateTo(history[historyIndex + 1]!, { replaceHistory: true })) {
      set({ historyIndex: historyIndex + 1 })
    }
  },

  async goUp() {
    const parent = get().currentPath && dirname(get().currentPath!)
    if (parent) await get().navigateTo(parent)
  },

  async createFolder(name) {
    const { currentPath } = get()
    if (!currentPath) return null

    try {
      const created = await getFileSystemService().createDirectory(currentPath, name)
      await get().refresh()
      return created
    } catch (error) {
      set({ error: toMessage(error) })
      return null
    }
  },

  async renameEntry(path, newName) {
    try {
      const renamed = await getFileSystemService().renameEntry(path, newName)
      await get().refresh()
      return renamed
    } catch (error) {
      set({ error: toMessage(error) })
      return null
    }
  },

  async deleteEntries(paths) {
    if (paths.length === 0) return false

    try {
      await getFileSystemService().deleteEntries(paths)
      await get().refresh()
      return true
    } catch (error) {
      set({ error: toMessage(error) })
      return false
    }
  },

  async refresh() {
    const { currentPath, cache } = get()
    if (!currentPath) return
    cache.delete(currentPath)
    await get().navigateTo(currentPath, { replaceHistory: true, force: true })
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
