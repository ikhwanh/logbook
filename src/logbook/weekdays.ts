// Index 0 is Monday, matching weekday() in processors/dates.
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function parseDays(value: string): number[] | undefined {
  const tokens = value.split(/[\s,]+/).filter(Boolean)
  const days = new Set<number>()
  for (const token of tokens) {
    const index = WEEKDAYS.findIndex((day) => day.toLowerCase() === token.slice(0, 3).toLowerCase())
    if (index === -1) return undefined
    days.add(index)
  }
  return [...days].sort((a, b) => a - b)
}

export function formatDays(days: number[]): string {
  return days.map((day) => WEEKDAYS[day]).join(',')
}
