<script setup lang="ts">
import { RouterView } from 'vue-router'
import OnlineStatus from '@/components/OnlineStatus.vue'
import ReloadPrompt from '@/components/ReloadPrompt.vue'
</script>

<template>
  <header>
    <h1>Logbook</h1>
    <OnlineStatus />
  </header>
  <RouterView />
  <ReloadPrompt />
</template>

<style>
:root {
  --bg: #f4f1ea;
  --surface: #fffdf8;
  --text: #1d2320;
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
  max-width: 48rem;
  margin: 0 auto;
  padding: 1rem;
}

header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
