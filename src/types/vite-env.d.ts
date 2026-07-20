/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_FS_PROVIDER?: string
  readonly VITE_STAR_COUNT?: string
  readonly VITE_ENABLE_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
