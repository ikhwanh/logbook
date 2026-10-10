import { liveQuery } from 'dexie'
import { computed, shallowRef } from 'vue'
import { defaultSettings, getSettings, type AppSettings, type Theme } from '@/db/settings'
import { processors } from '@/processors'

// A single app-wide subscription so every view renders with loaded settings
// instead of briefly showing defaults (e.g. hidden tabs flashing in).
export const settings = shallowRef<AppSettings>(defaultSettings)

export const visibleProcessors = computed(() =>
  processors.filter((p) => !settings.value.hiddenViews.includes(p.id)),
)

export async function startSettings() {
  settings.value = await getSettings()
  liveQuery(getSettings).subscribe({
    next: (result) => (settings.value = result),
    error: (error) => console.error('Settings subscription failed', error),
  })
}

export function applyTheme(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}
