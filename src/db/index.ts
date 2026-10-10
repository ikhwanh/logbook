import Dexie, { type EntityTable } from 'dexie'

export interface Setting {
  key: string
  value: unknown
}

export class LogbookDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('logbook')
    // Add new tables or indexes in a new version(n) block; never edit a shipped version.
    this.version(1).stores({
      settings: 'key',
    })
  }
}

export const db = new LogbookDB()
