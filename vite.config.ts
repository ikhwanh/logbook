import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repo>/, so CI sets this.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      // Prompt instead of auto-reloading so an update never interrupts unsaved work.
      registerType: 'prompt',
      pwaAssets: {
        image: 'public/logo.svg',
      },
      manifest: {
        name: 'Logbook',
        short_name: 'Logbook',
        description: 'Offline-first logbook. All data stays on this device.',
        theme_color: '#1f6f5c',
        background_color: '#f4f1ea',
        display: 'standalone',
        start_url: '.',
        scope: '.',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
        // Assets aren't on disk in dev, so the precache glob always matches nothing.
        suppressWarnings: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
