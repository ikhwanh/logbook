import Dexie, { type EntityTable } from 'dexie'
import type { ProcessorId } from '@/processors/types'

export interface Setting {
  key: string
  value: unknown
}

export type ColumnType = 'text' | 'number' | 'select' | 'date' | 'checkbox'

export interface Column {
  id: string
  name: string
  type: ColumnType
  options?: string[]
}

export interface Logbook {
  id: string
  name: string
  columns: Column[]
  // Which column each processor slot uses, when the user picked one.
  processors?: Partial<Record<ProcessorId, Record<string, string>>>
  createdAt: number
  updatedAt: number
}

export type CellValue = string | number | boolean

export interface Entry {
  id: string
  logbookId: string
  // Keyed by column id, not name, so renaming a column keeps its data.
  values: Record<string, CellValue>
  createdAt: number
  updatedAt: number
}

export class LogbookDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>
  logbooks!: EntityTable<Logbook, 'id'>
  entries!: EntityTable<Entry, 'id'>

  constructor() {
    super('logbook')
    // Add new tables or indexes in a new version(n) block; never edit a shipped version.
    this.version(1).stores({
      settings: 'key',
    })
    this.version(2).stores({
      logbooks: 'id, updatedAt',
      entries: 'id, [logbookId+createdAt]',
    })
  }
}

export const db = new LogbookDB()
