import { readCell } from './binding'
import type { Processor } from './types'

export interface TotalsGroup {
  name: string
  sum: number
  count: number
  average: number
  uncategorized: boolean
}

export interface TotalsResult {
  groups: TotalsGroup[]
  total: number
  count: number
}

export const UNCATEGORIZED = 'Uncategorized'

export const totals: Processor<TotalsResult> = {
  id: 'totals',
  name: 'Totals',
  description: 'Sum a number per category',
  slots: [
    { key: 'category', label: 'Category', type: 'select' },
    { key: 'amount', label: 'Amount', type: 'number' },
  ],
  isEmpty: (result) => result.count === 0,
  run(entries, columns) {
    const groups = new Map<string, { sum: number; count: number }>()
    let total = 0
    let count = 0

    for (const entry of entries) {
      const amount = readCell(entry, columns.amount!)
      if (typeof amount !== 'number') continue
      const category = readCell(entry, columns.category!)
      const key = typeof category === 'string' ? category : ''
      const group = groups.get(key) ?? { sum: 0, count: 0 }
      group.sum += amount
      group.count += 1
      groups.set(key, group)
      total += amount
      count += 1
    }

    return {
      groups: [...groups]
        .map(([name, { sum, count }]) => ({
          name: name || UNCATEGORIZED,
          sum,
          count,
          average: sum / count,
          uncategorized: name === '',
        }))
        // Uncategorized always sorts last so it doesn't read as a real category.
        .sort((a, b) => Number(a.uncategorized) - Number(b.uncategorized) || b.sum - a.sum),
      total,
      count,
    }
  },
}
