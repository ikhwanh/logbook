<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import OnlineStatus from '@/components/OnlineStatus.vue'
import ReloadPrompt from '@/components/ReloadPrompt.vue'
</script>

<template>
  <header>
    <h1><RouterLink :to="{ name: 'home' }">Logbook</RouterLink></h1>
    <OnlineStatus />
  </header>
  <!-- Keyed by path so live queries restart when switching between logbooks. -->
  <RouterView :key="$route.path" />
  <ReloadPrompt />
</template>

<style>
:root {
  --bg: #f4f1ea;
  --surface: #fffdf8;
  --text: #1d2320;
  --muted: #6b726d;
  --border: #ddd6c6;
  --accent: #1f6f5c;
  --accent-soft: #dcebe5;
  --warn: #8a4b00;
  --warn-soft: #f7e3c4;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161a18;
    --surface: #1f2421;
    --text: #e8e6e0;
    --muted: #979f99;
    --border: #343b37;
    --accent: #7fc8b2;
    --accent-soft: #1f3a32;
    --warn: #f0b768;
    --warn-soft: #3d2c14;
  }
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
