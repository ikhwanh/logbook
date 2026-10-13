import type { CellValue, Column, Entry, Logbook } from '@/db'
import { columnTypes } from './columnTypes'

function compareText(a: CellValue, b: CellValue) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function comparator(column: Column): (a: CellValue, b: CellValue) => number {
  switch (column.type) {
    case 'number':
    case 'checkbox':
      return (a, b) => Number(a) - Number(b)
    case 'date':
      return (a, b) => (a < b ? -1 : a > b ? 1 : 0)
    case 'select': {
      // Options the column no longer lists sort after the listed ones.
      const rank = (value: CellValue) => {
        const index = column.options?.indexOf(String(value)) ?? -1
        return index === -1 ? Infinity : index
      }
      return (a, b) => rank(a) - rank(b) || compareText(a, b)
    }
    case 'text':
      return compareText
  }
}

// Empty and unreadable cells stay last in both directions, so a new blank row
// lands at the bottom next to the add button. Ties keep creation order.
export function sortEntries(entries: Entry[], logbook: Logbook): Entry[] {
  const { sort } = logbook
  const column = sort && logbook.columns.find((c) => c.id === sort.columnId)
  if (!sort || !column) return entries
  const { coerce } = columnTypes[column.type]
  const compare = comparator(column)
  const sign = sort.direction === 'asc' ? 1 : -1
  const read = (entry: Entry) => {
    const value = entry.values[column.id]
    // Unticking a checkbox clears the cell, so a missing value there means false.
    if (value === undefined) return column.type === 'checkbox' ? false : undefined
    return coerce(value)
  }
  return entries
    .map((entry) => ({ entry, value: read(entry) }))
    .sort((a, b) => {
      if (a.value === undefined || b.value === undefined) {
        return Number(a.value === undefined) - Number(b.value === undefined)
      }
      return sign * compare(a.value, b.value)
    })
    .map(({ entry }) => entry)
}
