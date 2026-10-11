import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../index'
import { defaultSettings, getSettings, setTheme } from '../settings'

describe('settings', () => {
  beforeEach(() => db.settings.clear())

  it('returns defaults when nothing is stored', async () => {
    expect(await getSettings()).toEqual(defaultSettings)
  })

  it('saves the theme', async () => {
    await setTheme('dark')
    expect((await getSettings()).theme).toBe('dark')
  })

  it('ignores an invalid stored theme', async () => {
    await db.settings.put({ key: 'theme', value: 'neon' })
    expect(await getSettings()).toEqual({ theme: 'system' })
  })
})
