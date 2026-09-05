import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import path from 'node:path'
import manifestJson from './public/manifest.json' with { type: 'json' }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000'

  // The manifest checked into the repo only lists localhost:3000 as a dev
  // convenience — without this, a production build would still request
  // permission for localhost instead of wherever VITE_API_URL actually
  // points, and the extension would be unable to reach its real backend
  // once installed by an actual user.
  const apiOrigin = `${new URL(apiUrl).origin}/*`
  const manifest = {
    ...manifestJson,
    host_permissions: Array.from(
      new Set([
        apiOrigin,
        ...manifestJson.host_permissions.filter((p) => !p.startsWith('http://localhost')),
      ]),
    ),
  }

  return {
    plugins: [react(), tailwindcss(), crx({ manifest })],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          history: path.resolve(import.meta.dirname, 'history.html'),
          offscreen: path.resolve(import.meta.dirname, 'offscreen.html'),
        },
      },
    },
  }
})