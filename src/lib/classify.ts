import type { EntryKind } from '@/types'
import { extension } from '@/utils/path'

const EXTENSION_MAP: Record<string, EntryKind> = {
  // images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  // video
  mp4: 'video',
  mov: 'video',
  mkv: 'video',
  avi: 'video',
  webm: 'video',
  // audio
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  // archives
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  gz: 'archive',
  tar: 'archive',
  // executables
  exe: 'app',
  msi: 'app',
  bat: 'app',
  ps1: 'app',
  // code
  ts: 'code',
  tsx: 'code',
  js: 'code',
  jsx: 'code',
  rs: 'code',
  py: 'code',
  css: 'code',
  html: 'code',
  json: 'code',
  glsl: 'code',
  toml: 'code',
}

export function classifyEntry(name: string, isDirectory: boolean): EntryKind {
  if (isDirectory) return 'folder'
  return EXTENSION_MAP[extension(name)] ?? 'doc'
}

export const ENTRY_KIND_LABEL: Record<EntryKind, string> = {
  folder: 'Folder',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  archive: 'Archive',
  app: 'Application',
  code: 'Code file',
  doc: 'Document',
}
