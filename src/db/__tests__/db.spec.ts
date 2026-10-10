import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../index'

describe('db', () => {
  beforeEach(() => db.settings.clear())

  it('round-trips a setting', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' })
    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'dark' })
  })
})
