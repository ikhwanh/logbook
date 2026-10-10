import type { CellValue, Column, Entry, Logbook } from '@/db'
import { columnTypes } from '@/logbook/columnTypes'
import type { Processor, Slot } from './types'

export type BindingResult =
  { ok: true; columns: Record<string, Column> } | { ok: false; missing: Slot[] }

export function candidates(slot: Slot, logbook: Logbook): Column[] {
  return logbook.columns.filter((column) => column.type === slot.type)
}

export function resolveBinding(processor: Processor, logbook: Logbook): BindingResult {
  const saved = logbook.processors?.[processor.id] ?? {}
  const columns: Record<string, Column> = {}
  const taken = new Set<string>()

  // Saved choices go first so auto-picked slots can't steal their columns.
  for (const slot of processor.slots) {
    const column = logbook.columns.find((c) => c.id === saved[slot.key])
    if (column?.type === slot.type && !taken.has(column.id)) {
      columns[slot.key] = column
      taken.add(column.id)
    }
  }

  const missing: Slot[] = []
  for (const slot of processor.slots) {
    if (columns[slot.key]) continue
    const column = candidates(slot, logbook).find((c) => !taken.has(c.id))
    if (column) {
      columns[slot.key] = column
      taken.add(column.id)
    } else {
      missing.push(slot)
    }
  }

  return missing.length ? { ok: false, missing } : { ok: true, columns }
}

export function readCell(entry: Entry, column: Column): CellValue | undefined {
  const value = entry.values[column.id]
  return value === undefined ? undefined : columnTypes[column.type].coerce(value)
}
