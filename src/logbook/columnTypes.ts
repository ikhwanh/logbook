import type { CellValue, ColumnType } from '@/db'
import { formatDays, parseDays } from './weekdays'

interface ColumnTypeDef {
  label: string
  width: string
  // Reads a stored value as this type. Returns undefined when the value can't be
  // read, which happens after a column's type changes: the old value is kept in
  // storage untouched and the cell is flagged until the user overwrites it.
  coerce: (value: CellValue) => CellValue | undefined
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
// Seconds are allowed because some browsers' time pickers add them; they're dropped.
const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/
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
  time: {
    label: 'Time',
    width: '8rem',
    coerce: (value) => {
      const match = typeof value === 'string' ? TIME_PATTERN.exec(value.trim()) : null
      return match ? `${match[1]!.padStart(2, '0')}:${match[2]}` : undefined
    },
  },
  days: {
    label: 'Days',
    width: '13rem',
    coerce: (value) => {
      if (typeof value !== 'string') return undefined
      const days = parseDays(value)
      return days?.length ? formatDays(days) : undefined
    },
  },
}

export const columnTypeIds = Object.keys(columnTypes) as ColumnType[]
