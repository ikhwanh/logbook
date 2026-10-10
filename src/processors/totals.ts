import type { Column, Entry } from '@/db'
import { readCell } from './binding'
import { addDays, localToday } from './dates'
import type { Processor } from './types'

export interface TotalsGroup {
  name: string
  sum: number
  count: number
  average: number
  uncategorized: boolean
}

export interface TotalsSection {
  groups: TotalsGroup[]
  total: number
  count: number
}

export type TotalsRangeId = 'month' | 'lastMonth' | 'last30' | 'year' | 'all'

export interface TotalsRange {
  id: TotalsRangeId
  label: string
  // Every row when no type column is bound, otherwise only the non-income rows.
  expense: TotalsSection
  income: TotalsSection | null
}

export interface TotalsResult {
  // Just the 'all' range when no date column is bound.
  ranges: TotalsRange[]
}

export const UNCATEGORIZED = 'Uncategorized'
export const INCOME = 'Income'

interface Period {
  id: TotalsRangeId
  label: string
  includes: (date: string | undefined) => boolean
}

type Sums = Map<string, { sum: number; count: number }>

const ALL_TIME: Period = { id: 'all', label: 'All time', includes: () => true }

function datePeriods(today: string): Period[] {
  const month = today.slice(0, 7)
  const lastMonth = addDays(`${month}-01`, -1).slice(0, 7)
  const since = addDays(today, -29)
  const year = today.slice(0, 4)
  return [
    { id: 'month', label: 'This month', includes: (date) => date?.slice(0, 7) === month },
    { id: 'lastMonth', label: 'Last month', includes: (date) => date?.slice(0, 7) === lastMonth },
    {
      id: 'last30',
      label: 'Last 30 days',
      includes: (date) => date !== undefined && date >= since && date <= today,
    },
    { id: 'year', label: 'This year', includes: (date) => date?.slice(0, 4) === year },
  ]
}

function section(sums: Sums): TotalsSection {
  const groups = [...sums]
    .map(([name, { sum, count }]) => ({
      name: name || UNCATEGORIZED,
      sum,
      count,
      average: sum / count,
      uncategorized: name === '',
    }))
    // Uncategorized always sorts last so it doesn't read as a real category.
    .sort((a, b) => Number(a.uncategorized) - Number(b.uncategorized) || b.sum - a.sum)
  return {
    groups,
    total: groups.reduce((total, group) => total + group.sum, 0),
    count: groups.reduce((count, group) => count + group.count, 0),
  }
}

export function runTotals(
  entries: Entry[],
  columns: Record<string, Column>,
  today = localToday(),
): TotalsResult {
  const periods = [...(columns.date ? datePeriods(today) : []), ALL_TIME]
  const sums = periods.map(() => ({ expense: new Map() as Sums, income: new Map() as Sums }))

  for (const entry of entries) {
    const amount = readCell(entry, columns.amount!)
    if (typeof amount !== 'number') continue
    const category = readCell(entry, columns.category!)
    const key = typeof category === 'string' ? category : ''
    const type = columns.type && readCell(entry, columns.type)
    const income = typeof type === 'string' && type.trim().toLowerCase() === INCOME.toLowerCase()
    const date = columns.date && readCell(entry, columns.date)
    const day = typeof date === 'string' ? date : undefined

    periods.forEach((period, i) => {
      if (!period.includes(day)) return
      const target = income ? sums[i]!.income : sums[i]!.expense
      const group = target.get(key) ?? { sum: 0, count: 0 }
      group.sum += amount
      group.count += 1
      target.set(key, group)
    })
  }

  return {
    ranges: periods.map(({ id, label }, i) => ({
      id,
      label,
      expense: section(sums[i]!.expense),
      income: columns.type ? section(sums[i]!.income) : null,
    })),
  }
}

export const totals: Processor<TotalsResult> = {
  id: 'totals',
  name: 'Totals',
  description: 'Sum a number per category and period',
  slots: [
    { key: 'category', label: 'Category', type: 'select' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'type', label: 'Type', type: 'select', optional: true },
    { key: 'date', label: 'Date', type: 'date', optional: true },
  ],
  isEmpty(result) {
    const all = result.ranges.find((range) => range.id === 'all')!
    return all.expense.count + (all.income?.count ?? 0) === 0
  },
  run: (entries, columns) => runTotals(entries, columns),
}
