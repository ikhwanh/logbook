import type { Column, Entry } from '@/db'
import { readCell } from './binding'
import { addDays, localToday, toDayNumber, weekday } from './dates'
import type { Processor } from './types'

export interface StreakDay {
  date: string
  done: boolean
  future: boolean
}

export interface StreaksResult {
  current: number
  longest: number
  doneDays: number
  // Columns of 7 days, Monday first, ending with the week that contains today.
  weeks: StreakDay[][]
}

const WEEKS_SHOWN = 16

export function runStreaks(
  entries: Entry[],
  columns: Record<string, Column>,
  today = localToday(),
): StreaksResult {
  const done = new Set<string>()
  for (const entry of entries) {
    const date = readCell(entry, columns.date!)
    if (typeof date === 'string' && readCell(entry, columns.done!) === true) done.add(date)
  }

  const days = [...done].map(toDayNumber).sort((a, b) => a - b)
  let longest = 0
  let run = 0
  days.forEach((day, i) => {
    run = i > 0 && day === days[i - 1]! + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  })

  // A streak is still alive if today isn't logged yet but yesterday was.
  let cursor = done.has(today) ? today : addDays(today, -1)
  let current = 0
  while (done.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  const firstDay = addDays(today, -weekday(today) - (WEEKS_SHOWN - 1) * 7)
  const weeks: StreakDay[][] = []
  for (let w = 0; w < WEEKS_SHOWN; w++) {
    const week: StreakDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstDay, w * 7 + d)
      week.push({ date, done: done.has(date), future: date > today })
    }
    weeks.push(week)
  }

  return { current, longest, doneDays: done.size, weeks }
}

export const streaks: Processor<StreaksResult> = {
  id: 'streaks',
  name: 'Streaks',
  description: 'Daily habit calendar and streaks',
  slots: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'done', label: 'Done', type: 'checkbox' },
  ],
  run: (entries, columns) => runStreaks(entries, columns),
  // An empty calendar is still useful: it shows where today's square will go.
  isEmpty: () => false,
}
