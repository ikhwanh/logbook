# Logbook

Offline-first logbook built with Vue 3 and Vite. It is a fully client-side PWA with no backend: all data stays in the browser's IndexedDB.

## How it works

- **Storage**: [Dexie](https://dexie.org) over IndexedDB, in `src/db/index.ts`. To change the schema, add a new `version(n)` block and never edit one that has shipped. `useLiveQuery` (`src/composables/useLiveQuery.ts`) gives you reactive queries.
- **Durability**: on startup the app calls `navigator.storage.persist()` so the browser is less likely to evict data. Browsers grant this by their own heuristics (installed PWA, bookmarked, frequent use), so it may be denied. There is no server copy, so clearing site data deletes everything.
- **Offline**: `vite-plugin-pwa` generates a Workbox service worker that precaches the whole build. After the first visit, the app loads with no network.
- **Install**: the manifest and icons are generated from `public/logo.svg` at build time.
- **Updates**: when a new build is deployed, `ReloadPrompt.vue` asks before reloading (`registerType: 'prompt'`).
- **Routing**: uses hash history (`/#/...`), so the build runs on any static host without SPA rewrite rules.

## Scripts

```sh
npm install
npm run dev          # dev server; the service worker is enabled in dev too
npm run build        # type-check + production build to dist/
npm run preview      # serve dist/ to test install/offline
npm run test:unit    # Vitest (IndexedDB faked via fake-indexeddb)
npm run lint
npm run format
```

To test offline: run `npm run build && npm run preview`, open the app once, then stop the preview server and reload. The app should still load.
