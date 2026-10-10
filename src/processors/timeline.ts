import type { Column, Entry } from '@/db'
import { readCell } from './binding'
import { localToday, toDayNumber } from './dates'
import type { Processor } from './types'

export type TimelineStatus = 'upcoming' | 'active' | 'ended'

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
}

export interface TimelineResult {
  items: TimelineItem[]
  upcoming: number
  active: number
  ended: number
}

export function runTimeline(
  entries: Entry[],
  columns: Record<string, Column>,
  today = localToday(),
): TimelineResult {
  const now = toDayNumber(today)
  const items: TimelineItem[] = []

  for (const entry of entries) {
    const label = String(readCell(entry, columns.item!) ?? '').trim()
    const start = readCell(entry, columns.start!)
    const end = readCell(entry, columns.end!)
    if (label === '' || typeof start !== 'string' || typeof end !== 'string' || end < start) {
      continue
    }
    const startsIn = toDayNumber(start) - now
    const endsIn = toDayNumber(end) - now
    const length = endsIn - startsIn + 1
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
    { key: 'end', label: 'End', type: 'date' },
  ],
  run: (entries, columns) => runTimeline(entries, columns),
  isEmpty: (result) => result.items.length === 0,
}
