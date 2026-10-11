import type { CellValue, Column, Entry, Logbook } from '@/db'
import { columnTypes } from '@/logbook/columnTypes'
import type { Processor, Slot } from './types'

export type BindingResult =
  | { ok: true; columns: Record<string, Column>; multi: Record<string, Column[]> }
  | { ok: false; missing: Slot[] }

export function accepts(slot: Slot, column: Column): boolean {
  return column.type === slot.type || (slot.alternateTypes?.includes(column.type) ?? false)
}

export function candidates(slot: Slot, logbook: Logbook): Column[] {
  const primary = logbook.columns.filter((column) => column.type === slot.type)
  const alternate = logbook.columns.filter(
    (column) => column.type !== slot.type && accepts(slot, column),
  )
  return [...primary, ...alternate]
}

export function resolveBinding(processor: Processor, logbook: Logbook): BindingResult {
  const saved = logbook.processors?.[processor.id] ?? {}
  const single = processor.slots.filter((slot) => !slot.multiple)
  const columns: Record<string, Column> = {}
  const taken = new Set<string>()

  // Saved choices go first so auto-picked slots can't steal their columns.
  for (const slot of single) {
    const column = logbook.columns.find((c) => c.id === saved[slot.key])
    if (column && accepts(slot, column) && !taken.has(column.id)) {
      columns[slot.key] = column
      taken.add(column.id)
    }
  }

  // Columns the user ticked for a multi slot are a choice too, so auto-picking
  // avoids them unless nothing else fits.
  const reserved = new Set(
    processor.slots.flatMap((slot) => {
      const ids = saved[slot.key]
      return slot.multiple && Array.isArray(ids) ? ids : []
    }),
  )

  const missing: Slot[] = []
  for (const slot of single) {
    if (columns[slot.key]) continue
    // An empty saved choice is the "None" option, which only optional slots offer.
    if (slot.optional && saved[slot.key] === '') continue
    const free = candidates(slot, logbook).filter((c) => !taken.has(c.id))
    const column = free.find((c) => !reserved.has(c.id)) ?? free[0]
    if (column) {
      columns[slot.key] = column
      taken.add(column.id)
    } else if (!slot.optional) {
      missing.push(slot)
    }
  }
  if (missing.length) return { ok: false, missing }

  const multi: Record<string, Column[]> = {}
  for (const slot of processor.slots.filter((slot) => slot.multiple)) {
    const ids = saved[slot.key]
    multi[slot.key] = (Array.isArray(ids) ? ids : []).flatMap((id) => {
      const column = logbook.columns.find((c) => c.id === id)
      if (!column || !accepts(slot, column) || taken.has(column.id)) return []
      taken.add(column.id)
      return [column]
    })
  }
  return { ok: true, columns, multi }
}

export function readCell(entry: Entry, column: Column): CellValue | undefined {
  const value = entry.values[column.id]
  return value === undefined ? undefined : columnTypes[column.type].coerce(value)
}
