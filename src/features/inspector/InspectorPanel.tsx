import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { ENTRY_KIND_LABEL } from '@/lib/classify'
import { getFileSystemService } from '@/services/filesystem'
import { writeClipboard } from '@/services/platform'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useUiStore } from '@/store/uiStore'
import { formatBytes, formatCount, formatDate } from '@/utils/format'

import { useInspectedEntry } from './useInspectedEntry'

/** Right-hand detail panel for the targeted celestial body. */
export function InspectorPanel() {
  const entry = useInspectedEntry()
  const navigateTo = useFilesystemStore((state) => state.navigateTo)
  const clearSelection = useSelectionStore((state) => state.clear)
  const pushToast = useUiStore((state) => state.pushToast)

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          key={entry.path}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 18 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Panel title="Inspector" className="max-h-[calc(100vh-200px)]">
            <h3 className="px-1 pt-1 text-center text-[16.5px] font-medium wrap-anywhere">
              {entry.name}
            </h3>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-1 font-mono text-[10.5px]">
              <Row label="TYPE" value={ENTRY_KIND_LABEL[entry.kind]} />
              <Row
                label="SIZE"
                value={
                  entry.isDirectory
                    ? formatCount(entry.childCount ?? 0, 'item')
                    : formatBytes(entry.size)
                }
              />
              <Row label="MODIFIED" value={formatDate(entry.modifiedAt)} />
              <Row label="PATH" value={entry.path} />
            </dl>

            <div className="my-3 h-px bg-border" />

            <div className="flex flex-col gap-1">
              <Button
                variant="primary"
                size="sm"
                className="justify-start"
                onClick={() => {
                  if (entry.isDirectory) void navigateTo(entry.path)
                  else void getFileSystemService().openEntry(entry.path)
                }}
              >
                {entry.isDirectory ? 'Enter system' : 'Open'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  void writeClipboard(entry.path)
                  pushToast('Path copied')
                }}
              >
                Copy path
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => void getFileSystemService().revealEntry(entry.path)}
              >
                Reveal in Explorer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => clearSelection()}
              >
                Deselect
              </Button>
            </div>
          </Panel>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="text-right wrap-anywhere text-content/85">{value}</dd>
    </>
  )
}
