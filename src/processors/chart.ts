import { readCell } from './binding'
import type { Processor } from './types'

export interface ChartPoint {
  date: string
  value: number
}

export interface ChartResult {
  points: ChartPoint[]
  total: number
  average: number
  min: number
  max: number
}

export const chart: Processor<ChartResult> = {
  id: 'chart',
  name: 'Chart',
  description: 'A number plotted over time',
  slots: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'value', label: 'Value', type: 'number' },
  ],
  isEmpty: (result) => result.points.length === 0,
  run(entries, columns) {
    const byDate = new Map<string, number>()
    for (const entry of entries) {
      const date = readCell(entry, columns.date!)
      const value = readCell(entry, columns.value!)
      if (typeof date !== 'string' || typeof value !== 'number') continue
      byDate.set(date, (byDate.get(date) ?? 0) + value)
    }

    const points = [...byDate]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
    const values = points.map((p) => p.value)
    const total = values.reduce((sum, v) => sum + v, 0)

    return {
      points,
      total,
      average: points.length ? total / points.length : 0,
      min: points.length ? Math.min(...values) : 0,
      max: points.length ? Math.max(...values) : 0,
    }
  },
}
