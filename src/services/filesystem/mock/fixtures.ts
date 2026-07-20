/** Demo tree used by the mock provider — mirrors the design prototype. */

export interface MockNode {
  name: string
  isDirectory: boolean
  size?: number
  modifiedAt?: number
  children?: MockNode[]
}

const KB = 1024
const MB = 1024 * KB
const GB = 1024 * MB

const day = (iso: string) => Date.parse(iso)

const file = (name: string, size: number, modified: string): MockNode => ({
  name,
  isDirectory: false,
  size,
  modifiedAt: day(modified),
})

const dir = (name: string, modified: string, children: MockNode[]): MockNode => ({
  name,
  isDirectory: true,
  modifiedAt: day(modified),
  children,
})

export const MOCK_HOME_PATH = 'C:\\Users\\Nova'

const HOME: MockNode = dir('Nova', '2026-07-20', [
  dir('Desktop', '2026-07-18', [
    file('todo.txt', 2 * KB, '2026-07-18'),
    file('screenshot-042.png', 1.8 * MB, '2026-07-12'),
    file('galaxy.exe', 24 * MB, '2026-06-30'),
  ]),
  dir('Documents', '2026-07-16', [
    file('resume-2026.docx', 86 * KB, '2026-07-02'),
    file('tax-return.pdf', 1.1 * MB, '2026-04-09'),
    file('notes.md', 6 * KB, '2026-07-16'),
    file('budget.xlsx', 214 * KB, '2026-06-21'),
  ]),
  dir('Downloads', '2026-07-19', [
    file('setup-blender.exe', 312 * MB, '2026-07-19'),
    file('wallpaper-4k.jpg', 9.4 * MB, '2026-07-11'),
    file('dataset.zip', 1.9 * GB, '2026-07-05'),
    file('podcast-ep12.mp3', 58 * MB, '2026-07-01'),
  ]),
  dir('Pictures', '2026-07-14', [
    file('aurora.jpg', 4.2 * MB, '2026-07-14'),
    file('nebula-shot.png', 7.8 * MB, '2026-07-10'),
    file('family-trip.png', 3.1 * MB, '2026-05-28'),
    file('render-final.png', 12 * MB, '2026-06-15'),
  ]),
  dir('Videos', '2026-07-08', [
    file('demo-reel.mp4', 480 * MB, '2026-07-08'),
    file('tutorial-cut.mov', 1.2 * GB, '2026-06-27'),
  ]),
  dir('Music', '2026-06-30', [
    file('ambient-01.flac', 41 * MB, '2026-06-30'),
    file('voyager.mp3', 9.6 * MB, '2026-06-12'),
    file('lo-fi-set.wav', 120 * MB, '2026-05-30'),
  ]),
  dir('Projects', '2026-07-20', [
    dir('galaxy-app', '2026-07-20', [
      file('main.tsx', 14 * KB, '2026-07-20'),
      file('orbit.ts', 8 * KB, '2026-07-19'),
      file('warp.ts', 5 * KB, '2026-07-18'),
      file('README.md', 3 * KB, '2026-07-10'),
    ]),
    dir('website', '2026-07-03', [
      file('index.html', 11 * KB, '2026-07-03'),
      file('style.css', 22 * KB, '2026-07-03'),
      file('hero.jpg', 2.6 * MB, '2026-06-28'),
    ]),
    file('roadmap.md', 9 * KB, '2026-07-17'),
    file('pitch.mp4', 96 * MB, '2026-07-06'),
  ]),
  file('profile.png', 940 * KB, '2026-03-12'),
  file('backup-2025.zip', 4.7 * GB, '2026-01-02'),
])

/** Drive roots, keyed by the drive path. Every mock lookup starts here. */
export const MOCK_ROOTS: Record<string, MockNode> = {
  'C:': dir('C:', '2026-07-20', [
    dir('Users', '2026-07-20', [HOME]),
    dir('Program Files', '2026-05-02', [
      dir('Galaxy', '2026-05-02', [file('galaxy.exe', 24 * MB, '2026-05-02')]),
    ]),
    dir('Windows', '2026-06-11', [file('explorer.exe', 5 * MB, '2026-06-11')]),
  ]),
  'D:': dir('D:', '2026-07-12', [
    dir('Archive', '2026-07-12', [file('2025-backup.zip', 4.7 * GB, '2026-01-02')]),
    dir('Games', '2026-06-02', []),
  ]),
}

export const MOCK_DRIVES = [
  { path: 'C:\\', label: 'Local Disk (C:)', totalBytes: 512 * GB, freeBytes: 187 * GB },
  { path: 'D:\\', label: 'Data (D:)', totalBytes: 2 * 1024 * GB, freeBytes: 940 * GB },
]
