import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../index'
import { buildExamples } from '@/processors/examples'
import {
  addView,
  createLogbook,
  createLogbookFromTemplate,
  listEntries,
  saveBinding,
} from '../logbooks'
import { exportLogbooks, importLogbooks, ImportError, parseExport } from '../transfer'

async function roundTrip(ids?: string[]) {
  return importLogbooks(parseExport(JSON.stringify(await exportLogbooks(ids))))
}

describe('transfer', () => {
  beforeEach(async () => {
    await db.logbooks.clear()
    await db.entries.clear()
  })

  it('imports an exported logbook as a new copy', async () => {
    const id = await createLogbookFromTemplate(buildExamples('2026-10-10').chart)
    const original = (await db.logbooks.get(id))!
    await saveBinding(id, 'chart', 'value', original.columns[1]!.id)
    await saveBinding(id, 'timeline', 'marks', [original.columns[0]!.id])

    const [copyId] = await roundTrip([id])
    const copy = (await db.logbooks.get(copyId!))!
    const before = await listEntries(id)
    const after = await listEntries(copyId!)

    expect(copyId).not.toBe(id)
    expect(copy.name).toBe(original.name)
    expect(copy.columns).toEqual(original.columns)
    expect(copy.processors).toEqual({
      chart: { value: original.columns[1]!.id },
      timeline: { marks: [original.columns[0]!.id] },
    })
    expect(after.map((e) => e.values)).toEqual(before.map((e) => e.values))
    expect(after.map((e) => e.id)).not.toContain(before[0]!.id)
    expect(before).toHaveLength(after.length)
  })

  it('keeps views in their order', async () => {
    const id = await createLogbook('Fuel')
    await addView(id, 'streaks')
    await addView(id, 'checklist')
    const [copyId] = await roundTrip([id])
    expect((await db.logbooks.get(copyId!))?.views).toEqual(['streaks', 'checklist'])
  })

  it('drops unknown views and gives older exports their supported views', async () => {
    const id = await createLogbookFromTemplate(buildExamples('2026-10-10').chart)
    const file = await exportLogbooks([id])
    const withUnknown = structuredClone(file)
    withUnknown.logbooks[0]!.logbook.views = ['totals', 'gone', 'totals'] as never
    const withoutViews = structuredClone(file)
    delete withoutViews.logbooks[0]!.logbook.views

    expect(parseExport(JSON.stringify(withUnknown)).logbooks[0]!.logbook.views).toEqual(['totals'])
    expect(parseExport(JSON.stringify(withoutViews)).logbooks[0]!.logbook.views).toEqual([
      'chart',
      'totals',
    ])
  })

  it('creates independent copies when importing the same file twice', async () => {
    const id = await createLogbook('Fuel')
    const file = JSON.stringify(await exportLogbooks([id]))
    const [a] = await importLogbooks(parseExport(file))
    const [b] = await importLogbooks(parseExport(file))
    expect(new Set([id, a, b]).size).toBe(3)
    expect(await db.logbooks.count()).toBe(3)
  })

  it('exports all logbooks or only the requested ones', async () => {
    const a = await createLogbook('A')
    const b = await createLogbook('B')
    expect((await exportLogbooks()).logbooks.map((l) => l.logbook.id).sort()).toEqual([a, b].sort())
    expect((await exportLogbooks([b])).logbooks.map((l) => l.logbook.id)).toEqual([b])
  })

  it('rejects files that are not valid exports', async () => {
    const id = await createLogbookFromTemplate(buildExamples('2026-10-10').chart)
    const valid = await exportLogbooks([id])
    const withColumnType = structuredClone(valid)
    ;(withColumnType.logbooks[0]!.logbook.columns[0] as { type: string }).type = 'color'
    const withObjectCell = structuredClone(valid)
    ;(withObjectCell.logbooks[0]!.entries[0]!.values as Record<string, unknown>).x = { a: 1 }
    const withNumberBinding = structuredClone(valid)
    ;(withNumberBinding.logbooks[0]!.logbook as { processors: unknown }).processors = {
      timeline: { marks: ['a', 1] },
    }

    const withStringViews = structuredClone(valid)
    ;(withStringViews.logbooks[0]!.logbook as { views: unknown }).views = 'chart'

    const invalid = [
      'not json',
      JSON.stringify({ ...valid, format: 'other' }),
      JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify(withColumnType),
      JSON.stringify(withObjectCell),
      JSON.stringify(withNumberBinding),
      JSON.stringify(withStringViews),
    ]
    for (const text of invalid) expect(() => parseExport(text)).toThrow(ImportError)
  })
})
