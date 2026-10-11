<script setup lang="ts">
import { setTheme, themes, type Theme } from '@/db/settings'
import { settings } from '@/settings'

const themeLabels: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}
</script>

<template>
  <main class="settings">
    <h2>Settings</h2>

    <fieldset>
      <legend>Theme</legend>
      <div class="options themes">
        <label v-for="theme in themes" :key="theme">
          <input
            type="radio"
            name="theme"
            :value="theme"
            :checked="settings.theme === theme"
            @change="setTheme(theme)"
          />
          {{ themeLabels[theme] }}
        </label>
      </div>
      <p class="meta">System follows your device's light or dark mode.</p>
    </fieldset>
  </main>
</template>

<style scoped>
.settings {
  box-sizing: border-box;
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 1rem;
  overflow-y: auto;
}

h2 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

fieldset {
  margin: 0 0 1.5rem;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.5rem;
  padding: 0;
  font-weight: 600;
}

.meta {
  margin: 0 0 0.5rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.options {
  margin: 0 0 0.5rem;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  list-style: none;
}

.themes {
  display: flex;
}

.themes label {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
}

.themes label + label {
  border-left: 1px solid var(--border);
}

.themes label:has(:checked) {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

input {
  margin: 0;
  accent-color: var(--accent);
}
</style>
