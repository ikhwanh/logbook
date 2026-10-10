// Dates are stored as YYYY-MM-DD and handled as UTC midnight so adding days
// never lands on the wrong date across a daylight-saving change.
const DAY_MS = 86_400_000

export function toDayNumber(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS
}

export function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(toDayNumber(date) + days)
}

export function localToday(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// 0 = Monday … 6 = Sunday
export function weekday(date: string): number {
  return (new Date(toDayNumber(date) * DAY_MS).getUTCDay() + 6) % 7
}
