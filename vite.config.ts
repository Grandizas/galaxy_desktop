import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/** Keep in sync with the `paths` entry in tsconfig.app.json. */
const alias = {
  '@': resolve('./src'),
  '@app': resolve('./src/app'),
  '@components': resolve('./src/components'),
  '@features': resolve('./src/features'),
  '@hooks': resolve('./src/hooks'),
  '@store': resolve('./src/store'),
  '@services': resolve('./src/services'),
  '@lib': resolve('./src/lib'),
  '@types': resolve('./src/types'),
  '@utils': resolve('./src/utils'),
  '@assets': resolve('./src/assets'),
  '@styles': resolve('./src/styles'),
}

// Tauri injects this when developing against a physical device / another host.
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias },

  // Vite reads `VITE_*` from .env files; `envPrefix` keeps that contract explicit.
  envPrefix: ['VITE_', 'TAURI_ENV_'],

  // Tauri expects a fixed dev port and swallows Rust-side errors otherwise.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },

  build: {
    target: 'chrome110', // WebView2 on Windows 10/11
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // Vite 8 minifies with oxc; leave the default rather than naming esbuild.
    minify: !process.env.TAURI_ENV_DEBUG,
    // The renderer stack dwarfs the app code — give it its own chunk so app
    // edits do not invalidate a 1 MB bundle.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/](three|@react-three)[\\/]/ }],
        },
      },
    },
  },
})
