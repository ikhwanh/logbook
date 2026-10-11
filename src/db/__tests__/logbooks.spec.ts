import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../index'
import { buildExamples } from '@/processors/examples'
import {
  addEntry,
  createLogbook,
  createLogbookFromTemplate,
  deleteColumn,
  deleteEntries,
  deleteLogbook,
  listEntries,
  moveColumn,
  saveBinding,
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

  it('moves columns left and right, staying within bounds', async () => {
    const logbookId = await createLogbook('Fuel')
    await saveColumn(logbookId, { id: 'liters', name: 'Liters', type: 'number' })
    const names = async () => (await db.logbooks.get(logbookId))!.columns.map((c) => c.name)

    await moveColumn(logbookId, 'liters', -1)
    expect(await names()).toEqual(['Date', 'Liters', 'Note'])

    await moveColumn(logbookId, 'liters', 1)
    expect(await names()).toEqual(['Date', 'Note', 'Liters'])

    await moveColumn(logbookId, 'liters', 1)
    const [first] = (await db.logbooks.get(logbookId))!.columns
    await moveColumn(logbookId, first!.id, -1)
    expect(await names()).toEqual(['Date', 'Note', 'Liters'])
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

  it('deletes only the given entries', async () => {
    const logbookId = await createLogbook('Fuel')
    const a = await addEntry(logbookId)
    const b = await addEntry(logbookId)
    const c = await addEntry(logbookId)
    await deleteEntries([a, c])
    expect((await listEntries(logbookId)).map((e) => e.id)).toEqual([b])
  })

  it('creates a logbook from a template with fresh column ids', async () => {
    const template = buildExamples('2026-10-10').chart
    const id = await createLogbookFromTemplate(template)
    const logbook = (await db.logbooks.get(id))!
    const entries = await listEntries(id)

    expect(logbook.columns.map((c) => c.name)).toEqual(template.columns.map((c) => c.name))
    expect(logbook.columns.map((c) => c.id)).not.toContain('date')
    expect(entries).toHaveLength(template.rows.length)
    const dateColumn = logbook.columns.find((c) => c.name === 'Date')!
    expect(entries[0]!.values[dateColumn.id]).toBe(template.rows[0]!.date)
  })

  it('saves a processor binding per slot', async () => {
    const id = await createLogbook('Fuel')
    await saveBinding(id, 'chart', 'value', 'a')
    await saveBinding(id, 'chart', 'date', 'b')
    expect((await db.logbooks.get(id))?.processors).toEqual({ chart: { value: 'a', date: 'b' } })

    await saveBinding(id, 'timeline', 'marks', ['c', 'd'])
    expect((await db.logbooks.get(id))?.processors?.timeline).toEqual({ marks: ['c', 'd'] })
  })
})
