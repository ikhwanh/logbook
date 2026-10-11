import Dexie from 'dexie'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, LogbookDB, type Logbook } from '../index'

describe('db', () => {
  beforeEach(() => db.settings.clear())

  it('round-trips a setting', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' })
    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'dark' })
  })

  it('gives existing logbooks their supported views that were not hidden', async () => {
    const name = 'migrate-test'
    const old = new Dexie(name)
    old.version(1).stores({ settings: 'key' })
    old.version(2).stores({ logbooks: 'id, updatedAt', entries: 'id, [logbookId+createdAt]' })
    const base = { createdAt: 0, updatedAt: 0 }
    await old.table<Logbook>('logbooks').bulkAdd([
      {
        ...base,
        id: 'habits',
        name: 'Habits',
        columns: [
          { id: 'date', name: 'Date', type: 'date' },
          { id: 'done', name: 'Done', type: 'checkbox' },
          { id: 'habit', name: 'Habit', type: 'text' },
        ],
      },
      {
        ...base,
        id: 'notes',
        name: 'Notes',
        columns: [{ id: 'note', name: 'Note', type: 'text' }],
      },
    ])
    await old.table('settings').put({ key: 'hiddenViews', value: ['streaks'] })
    old.close()

    const migrated = new LogbookDB(name)
    const habits = await migrated.logbooks.get('habits')
    expect(habits?.views).not.toContain('streaks')
    expect(habits?.views).toContain('checklist')
    expect((await migrated.logbooks.get('notes'))?.views).toEqual([])
    expect(await migrated.settings.get('hiddenViews')).toBeUndefined()
    await migrated.delete()
  })
})
