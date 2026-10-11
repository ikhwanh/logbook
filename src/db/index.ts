import Dexie, { type EntityTable } from 'dexie'
import { supportedViews } from '@/processors'
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
  processors?: Partial<Record<ProcessorId, Record<string, string | string[]>>>
  // Tabs shown after the always-present Table, in the order they were added.
  views?: ProcessorId[]
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

  constructor(name = 'logbook') {
    super(name)
    // Add new tables or indexes in a new version(n) block; never edit a shipped version.
    this.version(1).stores({
      settings: 'key',
    })
    this.version(2).stores({
      logbooks: 'id, updatedAt',
      entries: 'id, [logbookId+createdAt]',
    })
    // Views used to be hidden globally from settings; each logbook now starts
    // with the views its columns already support, minus the ones that were hidden.
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const hidden = (await tx.table<Setting, string>('settings').get('hiddenViews'))?.value
        const isHidden = (id: ProcessorId) => Array.isArray(hidden) && hidden.includes(id)
        await tx
          .table<Logbook, string>('logbooks')
          .toCollection()
          .modify((logbook) => {
            logbook.views = supportedViews(logbook).filter((id) => !isHidden(id))
          })
        await tx.table('settings').delete('hiddenViews')
      })
  }
}

export const db = new LogbookDB()
