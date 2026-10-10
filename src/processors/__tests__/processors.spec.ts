import { describe, it, expect } from 'vitest'
import type { CellValue, Column, Entry, Logbook } from '@/db'
import { resolveBinding } from '../binding'
import { chart } from '../chart'
import { checklist } from '../checklist'
import { buildExamples } from '../examples'
import { processors } from '../index'
import { runStreaks } from '../streaks'
import { runTimeline, timeline } from '../timeline'
import { totals } from '../totals'

const col = (id: string, type: Column['type']): Column => ({ id, name: id, type })

function logbook(columns: Column[], bindings?: Logbook['processors']): Logbook {
  return { id: 'lb', name: 'Test', columns, processors: bindings, createdAt: 0, updatedAt: 0 }
}

function entries(rows: Record<string, CellValue>[]): Entry[] {
  return rows.map((values, i) => ({
    id: `e${i}`,
    logbookId: 'lb',
    values,
    createdAt: i,
    updatedAt: i,
  }))
}

describe('resolveBinding', () => {
  const columns = [col('d', 'date'), col('liters', 'number'), col('cost', 'number')]

  it('auto-picks the first column of each type', () => {
    const result = resolveBinding(chart, logbook(columns))
    expect(result.ok && result.columns.value!.id).toBe('liters')
  })

  it('uses a saved choice', () => {
    const result = resolveBinding(chart, logbook(columns, { chart: { value: 'cost' } }))
    expect(result.ok && result.columns.value!.id).toBe('cost')
  })

  it('falls back when the saved column is gone or changed type', () => {
    const deleted = resolveBinding(chart, logbook(columns, { chart: { value: 'gone' } }))
    expect(deleted.ok && deleted.columns.value!.id).toBe('liters')

    const retyped = [col('d', 'date'), col('liters', 'number'), col('cost', 'text')]
    const changed = resolveBinding(chart, logbook(retyped, { chart: { value: 'cost' } }))
    expect(changed.ok && changed.columns.value!.id).toBe('liters')
  })

  it('fills same-typed slots in order, and a saved choice can swap them', () => {
    const plan = [col('name', 'text'), col('from', 'date'), col('to', 'date')]
    const auto = resolveBinding(timeline, logbook(plan))
    expect(auto.ok && [auto.columns.start!.id, auto.columns.end!.id]).toEqual(['from', 'to'])

    const saved = { timeline: { start: 'to', end: 'from' } }
    const swapped = resolveBinding(timeline, logbook(plan, saved))
    expect(swapped.ok && [swapped.columns.start!.id, swapped.columns.end!.id]).toEqual([
      'to',
      'from',
    ])
  })

  it('reports missing slots', () => {
    const result = resolveBinding(chart, logbook([col('d', 'date'), col('note', 'text')]))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.missing.map((s) => s.type)).toEqual(['number'])
  })
})

describe('chart', () => {
  it('sorts by date, sums same-day values, and skips unreadable cells', () => {
    const result = chart.run(
      entries([
        { d: '2026-10-03', v: 5 },
        { d: '2026-10-01', v: 2 },
        { d: '2026-10-03', v: 1 },
        { d: '2026-10-02', v: 'not a number' },
        { v: 9 },
      ]),
      { date: col('d', 'date'), value: col('v', 'number') },
    )
    expect(result.points).toEqual([
      { date: '2026-10-01', value: 2 },
      { date: '2026-10-03', value: 6 },
    ])
    expect(result).toMatchObject({ total: 8, average: 4, min: 2, max: 6 })
  })
})

describe('checklist', () => {
  it('counts done items and skips rows without a label', () => {
    const result = checklist.run(
      entries([{ i: 'Passport', c: true }, { i: 'Charger' }, { c: true }]),
      {
        item: col('i', 'text'),
        done: col('c', 'checkbox'),
      },
    )
    expect(result.items.map((item) => [item.label, item.done])).toEqual([
      ['Passport', true],
      ['Charger', false],
    ])
    expect(result).toMatchObject({ done: 1, total: 2 })
  })
})

describe('timeline', () => {
  const columns = { item: col('i', 'text'), start: col('s', 'date'), end: col('e', 'date') }
  // 2026-10-10 is today in every case.
  const run = (rows: Record<string, CellValue>[]) =>
    runTimeline(entries(rows), columns, '2026-10-10')

  it('counts elapsed days inclusively and clamps before the start and after the end', () => {
    const result = run([
      { i: 'Active', s: '2026-10-01', e: '2026-10-31' },
      { i: 'Upcoming', s: '2026-10-13', e: '2026-10-20' },
      { i: 'Ended', s: '2026-09-01', e: '2026-09-30' },
      { i: 'Today only', s: '2026-10-10', e: '2026-10-10' },
    ])
    const byLabel = Object.fromEntries(result.items.map((item) => [item.label, item]))
    expect(byLabel.Active).toMatchObject({ status: 'active', fraction: 10 / 31, endsIn: 21 })
    expect(byLabel.Upcoming).toMatchObject({ status: 'upcoming', fraction: 0, startsIn: 3 })
    expect(byLabel.Ended).toMatchObject({ status: 'ended', fraction: 1, endsIn: -10 })
    expect(byLabel['Today only']).toMatchObject({ status: 'active', fraction: 1, endsIn: 0 })
    expect(result).toMatchObject({ active: 2, upcoming: 1, ended: 1 })
  })

  it('sorts by start date and skips rows without a label or a valid range', () => {
    const result = run([
      { i: 'Second', s: '2026-10-05', e: '2026-10-20' },
      { i: 'First', s: '2026-10-01', e: '2026-10-20' },
      { i: ' ', s: '2026-10-01', e: '2026-10-02' },
      { i: 'No end', s: '2026-10-01' },
      { i: 'Backwards', s: '2026-10-20', e: '2026-10-01' },
      { i: 'Not a date', s: 'soon', e: '2026-10-20' },
    ])
    expect(result.items.map((item) => item.label)).toEqual(['First', 'Second'])
  })
})

describe('totals', () => {
  it('groups by category, sorted by sum, with uncategorized last', () => {
    const result = totals.run(
      entries([
        { c: 'Food', a: 10 },
        { a: 100 },
        { c: 'Bills', a: 50 },
        { c: 'Food', a: 30 },
        { c: 'Bills' },
      ]),
      { category: col('c', 'select'), amount: col('a', 'number') },
    )
    expect(result.groups.map((g) => [g.name, g.sum, g.count])).toEqual([
      ['Bills', 50, 1],
      ['Food', 40, 2],
      ['Uncategorized', 100, 1],
    ])
    expect(result).toMatchObject({ total: 190, count: 4 })
  })
})

describe('streaks', () => {
  const columns = { date: col('d', 'date'), done: col('x', 'checkbox') }
  const run = (dates: string[], today: string) =>
    runStreaks(entries(dates.map((d) => ({ d, x: true }))), columns, today)

  it('counts the current streak through today', () => {
    const result = run(['2026-10-08', '2026-10-09', '2026-10-10'], '2026-10-10')
    expect(result).toMatchObject({ current: 3, longest: 3 })
  })

  it('keeps the streak alive when only today is missing', () => {
    expect(run(['2026-10-08', '2026-10-09'], '2026-10-10').current).toBe(2)
    expect(run(['2026-10-07', '2026-10-08'], '2026-10-10').current).toBe(0)
  })

  it('finds the longest streak across gaps and month ends', () => {
    const result = run(
      ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-10'],
      '2026-10-10',
    )
    expect(result).toMatchObject({ current: 1, longest: 4, doneDays: 6 })
  })

  it('ignores unchecked days', () => {
    const result = runStreaks(entries([{ d: '2026-10-10', x: false }]), columns, '2026-10-10')
    expect(result.current).toBe(0)
  })

  it('lays out weeks Monday first, ending with the current week', () => {
    // 2026-10-10 is a Saturday.
    const { weeks } = run([], '2026-10-10')
    const lastWeek = weeks[weeks.length - 1]!
    expect(lastWeek[0]!.date).toBe('2026-10-05')
    expect(lastWeek[5]).toMatchObject({ date: '2026-10-10', future: false })
    expect(lastWeek[6]).toMatchObject({ date: '2026-10-11', future: true })
  })
})

describe('examples', () => {
  const examples = buildExamples('2026-10-10')

  it.each(processors)('$name example fits its processor and has data', (processor) => {
    const example = examples[processor.id]
    const result = resolveBinding(processor, logbook(example.columns))
    expect(result.ok).toBe(true)
    expect(example.rows.length).toBeGreaterThan(0)
  })

  it('is the same every time', () => {
    expect(buildExamples('2026-10-10')).toEqual(examples)
  })
})
