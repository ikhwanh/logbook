import type { CellValue, Column, Entry } from '@/db'
import { readCell } from './binding'
import { addDays, localToday, toDayNumber } from './dates'
import type { Processor } from './types'

export type TimelineStatus = 'upcoming' | 'active' | 'ended'

export interface TimelineMark {
  column: Column
  value: CellValue
  // Position along the bar, 0 at the start of the first day and 1 at the end of the last.
  at: number
}

export interface TimelineItem {
  entry: Entry
  label: string
  start: string
  end: string
  status: TimelineStatus
  // Share of the days elapsed, counting both the start and end days.
  fraction: number
  // Signed day counts from today; negative once the date has passed.
  startsIn: number
  endsIn: number
  marks: TimelineMark[]
}

export interface TimelineResult {
  items: TimelineItem[]
  upcoming: number
  active: number
  ended: number
}

// Dates and numbers both count days with the start day as day 1, so a date
// column and a number column holding the same point read the same.
function dayCount(value: CellValue | undefined, start: string): number | undefined {
  if (typeof value === 'string') return toDayNumber(value) - toDayNumber(start) + 1
  if (typeof value === 'number' && Number.isFinite(value)) return Math.ceil(value)
  return undefined
}

export function runTimeline(
  entries: Entry[],
  columns: Record<string, Column>,
  marks: Column[] = [],
  today = localToday(),
): TimelineResult {
  const now = toDayNumber(today)
  const items: TimelineItem[] = []

  for (const entry of entries) {
    const label = String(readCell(entry, columns.item!) ?? '').trim()
    const start = readCell(entry, columns.start!)
    if (label === '' || typeof start !== 'string') continue
    const length = dayCount(readCell(entry, columns.end!), start)
    if (length === undefined || length < 1) continue
    const end = addDays(start, length - 1)
    const startsIn = toDayNumber(start) - now
    const endsIn = startsIn + length - 1
    const elapsed = Math.min(Math.max(1 - startsIn, 0), length)
    items.push({
      entry,
      label,
      start,
      end,
      status: startsIn > 0 ? 'upcoming' : endsIn < 0 ? 'ended' : 'active',
      fraction: elapsed / length,
      startsIn,
      endsIn,
      marks: marks.flatMap((column) => {
        const value = readCell(entry, column)
        const count = dayCount(value, start)
        if (value === undefined || count === undefined) return []
        return [{ column, value, at: Math.min(Math.max(count / length, 0), 1) }]
      }),
    })
  }

  items.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
  const count = (status: TimelineStatus) => items.filter((item) => item.status === status).length
  return { items, upcoming: count('upcoming'), active: count('active'), ended: count('ended') }
}

export const timeline: Processor<TimelineResult> = {
  id: 'timeline',
  name: 'Timeline',
  description: 'Time elapsed between two dates',
  slots: [
    { key: 'item', label: 'Item', type: 'text' },
    { key: 'start', label: 'Start', type: 'date' },
    { key: 'end', label: 'End', type: 'date', alternateTypes: ['number'] },
    { key: 'marks', label: 'Marks', type: 'date', alternateTypes: ['number'], multiple: true },
  ],
  run: (entries, columns, multi) => runTimeline(entries, columns, multi?.marks),
  isEmpty: (result) => result.items.length === 0,
}
