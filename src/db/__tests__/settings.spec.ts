import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../index'
import { defaultSettings, getSettings, setTheme, setViewHidden } from '../settings'

describe('settings', () => {
  beforeEach(() => db.settings.clear())

  it('returns defaults when nothing is stored', async () => {
    expect(await getSettings()).toEqual(defaultSettings)
  })

  it('saves the theme', async () => {
    await setTheme('dark')
    expect((await getSettings()).theme).toBe('dark')
  })

  it('hides and shows views without duplicates', async () => {
    await setViewHidden('timeline', true)
    await setViewHidden('timeline', true)
    await setViewHidden('chart', true)
    expect((await getSettings()).hiddenViews).toEqual(['chart', 'timeline'])

    await setViewHidden('timeline', false)
    expect((await getSettings()).hiddenViews).toEqual(['chart'])
  })

  it('ignores invalid stored values', async () => {
    await db.settings.bulkPut([
      { key: 'theme', value: 'neon' },
      { key: 'hiddenViews', value: ['streaks', 'gone'] },
    ])
    expect(await getSettings()).toEqual({ theme: 'system', hiddenViews: ['streaks'] })

    await db.settings.put({ key: 'hiddenViews', value: 'chart' })
    expect((await getSettings()).hiddenViews).toEqual([])
  })
})
