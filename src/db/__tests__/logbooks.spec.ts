import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../index'
import {
  addEntry,
  createLogbook,
  deleteColumn,
  deleteLogbook,
  listEntries,
  saveColumn,
  updateCell,
} from '../logbooks'

describe('logbooks', () => {
  beforeEach(async () => {
    await db.logbooks.clear()
    await db.entries.clear()
  })

  afterEach(() => vi.useRealTimers())

  it('creates a logbook with default columns', async () => {
    const id = await createLogbook('Fuel')
    const logbook = await db.logbooks.get(id)
    expect(logbook?.name).toBe('Fuel')
    expect(logbook?.columns.map((c) => c.type)).toEqual(['date', 'text'])
  })

  it('sets and clears a cell', async () => {
    const logbookId = await createLogbook('Fuel')
    const entryId = await addEntry(logbookId)
    const entry = (await db.entries.get(entryId))!

    await updateCell(entry, 'liters', 12.5)
    expect((await db.entries.get(entryId))?.values).toEqual({ liters: 12.5 })

    await updateCell(entry, 'liters', undefined)
    expect((await db.entries.get(entryId))?.values).toEqual({})
  })

  it('lists entries of one logbook in creation order', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const a = await createLogbook('A')
    const b = await createLogbook('B')
    vi.setSystemTime(2000)
    const first = await addEntry(a)
    await addEntry(b)
    vi.setSystemTime(3000)
    const second = await addEntry(a)
    expect((await listEntries(a)).map((e) => e.id)).toEqual([first, second])
  })

  it('adds, updates, and deletes columns while keeping cell values', async () => {
    const logbookId = await createLogbook('Fuel')
    const entryId = await addEntry(logbookId)
    const column = { id: 'liters', name: 'Liters', type: 'number' as const }

    await saveColumn(logbookId, column)
    await saveColumn(logbookId, { ...column, name: 'Litres' })
    let columns = (await db.logbooks.get(logbookId))!.columns
    expect(columns[2]).toEqual({ ...column, name: 'Litres' })
    expect(columns).toHaveLength(3)

    await updateCell((await db.entries.get(entryId))!, 'liters', 40)
    await deleteColumn(logbookId, 'liters')
    columns = (await db.logbooks.get(logbookId))!.columns
    expect(columns).toHaveLength(2)
    expect((await db.entries.get(entryId))?.values).toEqual({ liters: 40 })
  })

  it('deletes a logbook with its entries only', async () => {
    const a = await createLogbook('A')
    const b = await createLogbook('B')
    await addEntry(a)
    await addEntry(b)
    await deleteLogbook(a)
    expect(await db.logbooks.get(a)).toBeUndefined()
    expect(await listEntries(a)).toEqual([])
    expect(await listEntries(b)).toHaveLength(1)
  })
})
