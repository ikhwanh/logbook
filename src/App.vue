<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import OnlineStatus from '@/components/OnlineStatus.vue'
import ReloadPrompt from '@/components/ReloadPrompt.vue'
</script>

<template>
  <header>
    <h1><RouterLink :to="{ name: 'home' }">Logbook</RouterLink></h1>
    <OnlineStatus />
    <RouterLink :to="{ name: 'settings' }" class="settings-link">Settings</RouterLink>
  </header>
  <!-- Keyed by path so live queries restart when switching between logbooks. -->
  <RouterView :key="$route.path" />
  <ReloadPrompt />
</template>

<style>
:root {
  --bg: light-dark(#f4f1ea, #161a18);
  --surface: light-dark(#fffdf8, #1f2421);
  --text: light-dark(#1d2320, #e8e6e0);
  --muted: light-dark(#6b726d, #979f99);
  --border: light-dark(#ddd6c6, #343b37);
  --accent: light-dark(#1f6f5c, #7fc8b2);
  --accent-soft: light-dark(#dcebe5, #1f3a32);
  --warn: light-dark(#8a4b00, #f0b768);
  --warn-soft: light-dark(#f7e3c4, #3d2c14);
  color-scheme: light dark;
}

:root[data-theme='light'] {
  color-scheme: light;
}

:root[data-theme='dark'] {
  color-scheme: dark;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
}

#app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
}

header h1 {
  margin: 0;
  font-size: 1.125rem;
}

header h1 a {
  color: var(--accent);
  text-decoration: none;
}

.settings-link {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  color: var(--muted);
  font-size: 0.875rem;
  text-decoration: none;
}

.settings-link:hover,
.settings-link.router-link-active {
  background: var(--accent-soft);
  color: var(--accent);
}

button {
  padding: 0.4375rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

button:hover {
  border-color: var(--accent);
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

button.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--surface);
}

button.danger {
  border-color: transparent;
  background: transparent;
  color: var(--warn);
}

button.danger:hover {
  background: var(--warn-soft);
}
</style>
