/** Runtime capability checks + native window controls. */

export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Window chrome actions. No-ops in the browser so the header stays clickable
 * during `pnpm dev`.
 */
export const windowControls = {
  async minimize() {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  },
  async toggleMaximize() {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().toggleMaximize()
  },
  async close() {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  },
}

export async function writeClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
