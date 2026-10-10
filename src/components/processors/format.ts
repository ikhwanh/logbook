import { toDayNumber } from '@/processors/dates'

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const compactFormat = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const shortDate = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatNumber(value: number) {
  return numberFormat.format(value)
}

export function formatCompact(value: number) {
  return Math.abs(value) >= 10_000 ? compactFormat.format(value) : numberFormat.format(value)
}

export function formatShortDate(date: string) {
  return shortDate.format(toDayNumber(date) * 86_400_000)
}

export function formatLongDate(date: string) {
  return longDate.format(toDayNumber(date) * 86_400_000)
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) || 1
    min -= pad
    max += pad
  }
  const rough = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!
  const ticks: number[] = []
  const first = Math.floor(min / step) * step
  for (let i = 0; ticks.length === 0 || ticks[ticks.length - 1]! < max; i++) {
    // toPrecision drops float noise like 0.30000000000000004 from repeated steps.
    ticks.push(Number((first + i * step).toPrecision(12)))
  }
  return ticks
}
