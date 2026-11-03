import type { Column, Entry } from '@/db'
import { parseDays } from '@/logbook/weekdays'
import { readCell } from './binding'
import { localToday, weekday } from './dates'
import type { Processor } from './types'

export interface Routine {
  entry: Entry
  label: string
  days: number[]
  // HH:MM
  time?: string
  description?: string
}

export interface RoutinesResult {
  routines: Routine[]
  // Index 0 is Monday.
  byDay: Routine[][]
  today: number
  todayCount: number
}

export function runRoutines(
  entries: Entry[],
  columns: Record<string, Column>,
  today = localToday(),
): RoutinesResult {
  const routines: Routine[] = []
  for (const entry of entries) {
    const label = String(readCell(entry, columns.name!) ?? '').trim()
    const value = readCell(entry, columns.days!)
    const days = typeof value === 'string' ? parseDays(value) : undefined
    if (label === '' || !days?.length) continue
    const time = columns.time ? readCell(entry, columns.time) : undefined
    const description = columns.description
      ? String(readCell(entry, columns.description) ?? '').trim()
      : ''
    routines.push({
      entry,
      label,
      days,
      ...(typeof time === 'string' && { time }),
      ...(description && { description }),
    })
  }

  // Untimed routines go after timed ones, since they can happen any time of day.
  routines.sort(
    (a, b) =>
      Number(a.time === undefined) - Number(b.time === undefined) ||
      (a.time ?? '').localeCompare(b.time ?? '') ||
      a.label.localeCompare(b.label),
  )
  const byDay = Array.from({ length: 7 }, (_, day) => routines.filter((r) => r.days.includes(day)))
  const todayIndex = weekday(today)
  return { routines, byDay, today: todayIndex, todayCount: byDay[todayIndex]!.length }
}

export const routines: Processor<RoutinesResult> = {
  id: 'routines',
  name: 'Routines',
  description: 'What to do on each day of the week',
  slots: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'days', label: 'Days', type: 'days' },
    { key: 'time', label: 'Time', type: 'time', optional: true },
    { key: 'description', label: 'Description', type: 'text', optional: true },
  ],
  run: (entries, columns) => runRoutines(entries, columns),
  isEmpty: (result) => result.routines.length === 0,
}
