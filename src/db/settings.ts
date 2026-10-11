import { db } from './index'

export type Theme = 'system' | 'light' | 'dark'

export const themes: Theme[] = ['system', 'light', 'dark']

export interface AppSettings {
  theme: Theme
}

export const defaultSettings: AppSettings = { theme: 'system' }

function parseTheme(value: unknown): Theme {
  return themes.includes(value as Theme) ? (value as Theme) : defaultSettings.theme
}

export async function getSettings(): Promise<AppSettings> {
  const theme = await db.settings.get('theme')
  return { theme: parseTheme(theme?.value) }
}

export function setTheme(theme: Theme) {
  return db.settings.put({ key: 'theme', value: theme })
}
