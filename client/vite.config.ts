import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import path from 'node:path'
import manifest from './public/manifest.json' with { type: 'json' }

export default defineConfig({
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
        offscreen: path.resolve(import.meta.dirname, 'public/offscreen.html'),
      },
    },
  },
})