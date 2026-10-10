import type { CellValue, ColumnType } from '@/db'

interface ColumnTypeDef {
  label: string
  width: string
  // Reads a stored value as this type. Returns undefined when the value can't be
  // read, which happens after a column's type changes: the old value is kept in
  // storage untouched and the cell is flagged until the user overwrites it.
  coerce: (value: CellValue) => CellValue | undefined
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 'x', '✓'])
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', ''])

export const columnTypes: Record<ColumnType, ColumnTypeDef> = {
  text: {
    label: 'Text',
    width: '14rem',
    coerce: (value) => String(value),
  },
  number: {
    label: 'Number',
    width: '8rem',
    coerce: (value) => {
      if (typeof value === 'number') return value
      if (typeof value !== 'string' || value.trim() === '') return undefined
      const number = Number(value.trim())
      return Number.isFinite(number) ? number : undefined
    },
  },
  select: {
    label: 'Select',
    width: '10rem',
    coerce: (value) => (typeof value === 'boolean' ? undefined : String(value)),
  },
  date: {
    label: 'Date',
    width: '10rem',
    coerce: (value) => (typeof value === 'string' && DATE_PATTERN.test(value) ? value : undefined),
  },
  checkbox: {
    label: 'Checkbox',
    width: '5rem',
    coerce: (value) => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'number') return value !== 0
      const word = value.trim().toLowerCase()
      if (TRUE_WORDS.has(word)) return true
      if (FALSE_WORDS.has(word)) return false
      return undefined
    },
  },
}

export const columnTypeIds = Object.keys(columnTypes) as ColumnType[]
