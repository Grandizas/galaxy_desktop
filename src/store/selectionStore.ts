import { create } from 'zustand'

interface SelectionState {
  /** Paths of every selected entry — a set to keep multi-select cheap. */
  selected: ReadonlySet<string>
  /** Anchor for future shift-range selection. */
  lastSelected: string | null
  /** Path of the entry under the cursor, or null. */
  hovered: string | null
}

interface SelectionActions {
  select: (path: string, mode?: 'replace' | 'toggle') => void
  selectMany: (paths: readonly string[]) => void
  clear: () => void
  setHovered: (path: string | null) => void
}

export const useSelectionStore = create<SelectionState & SelectionActions>((set) => ({
  selected: new Set<string>(),
  lastSelected: null,
  hovered: null,

  select: (path, mode = 'replace') =>
    set((state) => {
      if (mode === 'replace') return { selected: new Set([path]), lastSelected: path }
      const next = new Set(state.selected)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { selected: next, lastSelected: path }
    }),

  selectMany: (paths) => set({ selected: new Set(paths), lastSelected: paths.at(-1) ?? null }),
  clear: () => set({ selected: new Set<string>(), lastSelected: null }),
  setHovered: (hovered) => set({ hovered }),
}))

export const selectPrimarySelection = (state: SelectionState) =>
  state.lastSelected ?? [...state.selected][0] ?? null
