import type { CellValue, Column, Entry } from '@/db'
import { readCell } from './binding'
import { addDays, fromDayNumber, localToday, toDayNumber } from './dates'
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

export interface TimelineRoutine {
  item: TimelineItem
  column: Column
  every: number
  date: string
  dueIn: number
}

export interface TimelineResult {
  items: TimelineItem[]
  routines: TimelineRoutine[]
  hasRoutines: boolean
  upcoming: number
  active: number
  ended: number
}

// A number counts days after the start, so a date column and a number column
// holding the same point read the same.
function dateFrom(value: CellValue | undefined, start: string): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return addDays(start, Math.ceil(value))
  return undefined
}

const ROUTINES_PER_ITEM = 3

// Occurrences fall every `every` days after the start, up to the end; the start
// itself is when the item begins, not a repeat of it.
function nextOccurrences(item: TimelineItem, every: number, now: number): number[] {
  const start = toDayNumber(item.start)
  const end = toDayNumber(item.end)
  const days: number[] = []
  const first = start + Math.max(1, Math.ceil((now - start) / every)) * every
  for (let day = first; day <= end && days.length < ROUTINES_PER_ITEM; day += every) days.push(day)
  return days
}

export function runTimeline(
  entries: Entry[],
  columns: Record<string, Column>,
  marks: Column[] = [],
  routineColumns: Column[] = [],
  today = localToday(),
): TimelineResult {
  const now = toDayNumber(today)
  const items: TimelineItem[] = []
  const routines: TimelineRoutine[] = []

  for (const entry of entries) {
    const label = String(readCell(entry, columns.item!) ?? '').trim()
    const start = readCell(entry, columns.start!)
    if (label === '' || typeof start !== 'string') continue
    const end = dateFrom(readCell(entry, columns.end!), start)
    if (end === undefined || end < start) continue
    const startsIn = toDayNumber(start) - now
    const endsIn = toDayNumber(end) - now
    const length = endsIn - startsIn + 1
    const elapsed = Math.min(Math.max(1 - startsIn, 0), length)
    const item: TimelineItem = {
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
        const date = dateFrom(value, start)
        if (value === undefined || date === undefined) return []
        const count = toDayNumber(date) - toDayNumber(start) + 1
        return [{ column, value, at: Math.min(Math.max(count / length, 0), 1) }]
      }),
    }
    items.push(item)

    for (const column of routineColumns) {
      const value = readCell(entry, column)
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      const every = Math.ceil(value)
      if (every < 1) continue
      for (const day of nextOccurrences(item, every, now)) {
        routines.push({ item, column, every, date: fromDayNumber(day), dueIn: day - now })
      }
    }
  }

  items.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
  routines.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.item.label.localeCompare(b.item.label) ||
      a.column.name.localeCompare(b.column.name),
  )
  const count = (status: TimelineStatus) => items.filter((item) => item.status === status).length
  return {
    items,
    routines,
    hasRoutines: routineColumns.length > 0,
    upcoming: count('upcoming'),
    active: count('active'),
    ended: count('ended'),
  }
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
    { key: 'routines', label: 'Routines', type: 'number', multiple: true },
  ],
  run: (entries, columns, multi) => runTimeline(entries, columns, multi?.marks, multi?.routines),
  isEmpty: (result) => result.items.length === 0,
}
