import { processors } from '@/processors'
import type { ProcessorId } from '@/processors/types'
import { db } from './index'

export type Theme = 'system' | 'light' | 'dark'

export const themes: Theme[] = ['system', 'light', 'dark']

export interface AppSettings {
  theme: Theme
  // Hidden rather than visible views are stored so processors added later show up by default.
  hiddenViews: ProcessorId[]
}

export const defaultSettings: AppSettings = { theme: 'system', hiddenViews: [] }

function parseTheme(value: unknown): Theme {
  return themes.includes(value as Theme) ? (value as Theme) : defaultSettings.theme
}

function parseHiddenViews(value: unknown): ProcessorId[] {
  if (!Array.isArray(value)) return defaultSettings.hiddenViews
  return processors.map((p) => p.id).filter((id) => value.includes(id))
}

export async function getSettings(): Promise<AppSettings> {
  const [theme, hiddenViews] = await db.settings.bulkGet(['theme', 'hiddenViews'])
  return {
    theme: parseTheme(theme?.value),
    hiddenViews: parseHiddenViews(hiddenViews?.value),
  }
}

export function setTheme(theme: Theme) {
  return db.settings.put({ key: 'theme', value: theme })
}

export function setViewHidden(id: ProcessorId, hidden: boolean) {
  return db.transaction('rw', db.settings, async () => {
    const current = parseHiddenViews((await db.settings.get('hiddenViews'))?.value)
    const next = current.filter((view) => view !== id)
    if (hidden) next.push(id)
    await db.settings.put({ key: 'hiddenViews', value: next })
  })
}
