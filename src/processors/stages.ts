import type { Column, Entry } from '@/db'
import { readCell } from './binding'
import { localToday, toDayNumber } from './dates'
import type { Processor } from './types'

// Units that arrived in a place together and are still there.
export interface StageGroup {
  count: number
  since: string
  planted: string
  // Days in the place so far.
  days: number
}

export interface StageHolding {
  place: string
  count: number
  groups: StageGroup[]
}

// How long units stayed in a place before moving on to the next one. Kept per
// destination so failures don't skew how long growing ones took.
export interface StageStay {
  place: string
  to: string
  count: number
  min: number
  max: number
  average: number
}

export interface StageItem {
  label: string
  planted: string
  // Days since the first planting, counting the planting day as day 0.
  age: number
  total: number
  holdings: StageHolding[]
  stays: StageStay[]
}

export interface StagePlaceItem {
  label: string
  count: number
  minDays: number
  maxDays: number
}

export interface StagePlace {
  name: string
  count: number
  items: StagePlaceItem[]
}

// A row that moved more units out of a place than it held.
export interface StageProblem {
  entry: Entry
  label: string
  date: string
  place: string
  missing: number
}

export interface StagesResult {
  places: StagePlace[]
  items: StageItem[]
  problems: StageProblem[]
}

interface Move {
  entry: Entry
  index: number
  label: string
  date: string
  count: number
  to: string
  from: string
}

function text(entry: Entry, column: Column | undefined): string {
  if (!column) return ''
  const value = readCell(entry, column)
  return value === undefined ? '' : String(value).trim()
}

function placeOrder(columns: Record<string, Column>, moves: Move[]): string[] {
  const order = [...(columns.to!.options ?? []), ...(columns.from?.options ?? [])]
  for (const move of moves) order.push(...(move.from ? [move.from] : []), move.to)
  return [...new Set(order.map((place) => place.trim()).filter((place) => place !== ''))]
}

export function runStages(
  entries: Entry[],
  columns: Record<string, Column>,
  today = localToday(),
): StagesResult {
  const now = toDayNumber(today)
  const moves: Move[] = []
  entries.forEach((entry, index) => {
    const label = text(entry, columns.item)
    const date = readCell(entry, columns.date!)
    const to = text(entry, columns.to)
    const from = text(entry, columns.from)
    const count = columns.count ? readCell(entry, columns.count) : undefined
    const units = count === undefined ? 1 : count
    if (label === '' || typeof date !== 'string' || to === '' || to === from) return
    if (typeof units !== 'number' || !(units > 0)) return
    moves.push({ entry, index, label, date, count: units, to, from })
  })

  const order = placeOrder(columns, moves)
  const rank = (place: string) => (place === '' ? -1 : order.indexOf(place))
  // Same-day rows run in place order, so planting and moving on one day works
  // whichever row was typed first.
  moves.sort(
    (a, b) => a.date.localeCompare(b.date) || rank(a.from) - rank(b.from) || a.index - b.index,
  )

  type Group = Omit<StageGroup, 'days'>
  const holdings = new Map<string, Map<string, Group[]>>()
  const stays = new Map<string, { from: string; to: string; count: number; days: number }[]>()
  const problems: StageProblem[] = []

  for (const move of moves) {
    const places = holdings.get(move.label) ?? new Map<string, Group[]>()
    holdings.set(move.label, places)
    const arriving = places.get(move.to) ?? []
    places.set(move.to, arriving)

    if (move.from === '') {
      arriving.push({ count: move.count, since: move.date, planted: move.date })
      continue
    }

    // The units that arrived first are the ones that move on first.
    const leaving = places.get(move.from) ?? []
    const itemStays = stays.get(move.label) ?? []
    stays.set(move.label, itemStays)
    let remaining = move.count
    while (remaining > 0 && leaving.length > 0) {
      const group = leaving[0]!
      const taken = Math.min(group.count, remaining)
      group.count -= taken
      remaining -= taken
      if (group.count <= 0) leaving.shift()
      const days = toDayNumber(move.date) - toDayNumber(group.since)
      itemStays.push({ from: move.from, to: move.to, count: taken, days })
      arriving.push({ count: taken, since: move.date, planted: group.planted })
    }
    if (remaining > 0) {
      problems.push({
        entry: move.entry,
        label: move.label,
        date: move.date,
        place: move.from,
        missing: remaining,
      })
    }
  }

  const items: StageItem[] = []
  for (const [label, places] of holdings) {
    const itemHoldings = order.flatMap((place) => {
      const groups = (places.get(place) ?? []).map((group) => ({
        ...group,
        days: now - toDayNumber(group.since),
      }))
      const count = groups.reduce((sum, group) => sum + group.count, 0)
      return count > 0 ? [{ place, count, groups }] : []
    })
    if (itemHoldings.length === 0) continue
    const raw = stays.get(label) ?? []
    const itemStays = order.flatMap((place) =>
      order.flatMap((to) => {
        const list = raw.filter((stay) => stay.from === place && stay.to === to)
        if (list.length === 0) return []
        const count = list.reduce((sum, stay) => sum + stay.count, 0)
        const days = list.map((stay) => stay.days)
        const total = list.reduce((sum, stay) => sum + stay.count * stay.days, 0)
        const [min, max] = [Math.min(...days), Math.max(...days)]
        return [{ place, to, count, min, max, average: total / count }]
      }),
    )
    const planted = itemHoldings
      .flatMap((holding) => holding.groups.map((group) => group.planted))
      .reduce((earliest, date) => (date < earliest ? date : earliest))
    items.push({
      label,
      planted,
      age: now - toDayNumber(planted),
      total: itemHoldings.reduce((sum, holding) => sum + holding.count, 0),
      holdings: itemHoldings,
      stays: itemStays,
    })
  }
  items.sort((a, b) => a.planted.localeCompare(b.planted) || a.label.localeCompare(b.label))

  const places = order.map((name) => {
    const placeItems = items.flatMap((item) => {
      const holding = item.holdings.find((h) => h.place === name)
      if (!holding) return []
      const days = holding.groups.map((group) => group.days)
      return [
        {
          label: item.label,
          count: holding.count,
          minDays: Math.min(...days),
          maxDays: Math.max(...days),
        },
      ]
    })
    return { name, count: placeItems.reduce((sum, i) => sum + i.count, 0), items: placeItems }
  })

  return { places, items, problems }
}

export const stages: Processor<StagesResult> = {
  id: 'stages',
  name: 'Stages',
  description: 'Units moving through places, like seedlings through growth stages',
  slots: [
    { key: 'item', label: 'Item', type: 'text' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'to', label: 'To', type: 'select' },
    { key: 'from', label: 'From', type: 'select', optional: true },
    { key: 'count', label: 'Count', type: 'number', optional: true },
  ],
  run: (entries, columns) => runStages(entries, columns),
  isEmpty: (result) => result.items.length === 0,
}
