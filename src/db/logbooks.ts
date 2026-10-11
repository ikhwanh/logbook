import Dexie from 'dexie'
import type { ExampleTemplate, ProcessorId } from '@/processors/types'
import { db, type CellValue, type Column, type Entry, type Logbook } from './index'

export function listLogbooks() {
  return db.logbooks.orderBy('updatedAt').reverse().toArray()
}

export function listEntries(logbookId: string) {
  return db.entries
    .where('[logbookId+createdAt]')
    .between([logbookId, Dexie.minKey], [logbookId, Dexie.maxKey])
    .toArray()
}

export async function createLogbook(name: string): Promise<string> {
  const now = Date.now()
  const logbook: Logbook = {
    id: crypto.randomUUID(),
    name,
    columns: [
      { id: crypto.randomUUID(), name: 'Date', type: 'date' },
      { id: crypto.randomUUID(), name: 'Note', type: 'text' },
    ],
    createdAt: now,
    updatedAt: now,
  }
  await db.logbooks.add(logbook)
  return logbook.id
}

export async function createLogbookFromTemplate(template: ExampleTemplate): Promise<string> {
  const now = Date.now()
  const ids = new Map(template.columns.map((column) => [column.id, crypto.randomUUID()]))
  const logbook: Logbook = {
    id: crypto.randomUUID(),
    name: template.name,
    columns: template.columns.map((column) => ({ ...column, id: ids.get(column.id)! })),
    createdAt: now,
    updatedAt: now,
  }
  // Each row is a millisecond apart so they keep their template order.
  const entries: Entry[] = template.rows.map((row, i) => ({
    id: crypto.randomUUID(),
    logbookId: logbook.id,
    values: Object.fromEntries(Object.entries(row).map(([key, value]) => [ids.get(key)!, value])),
    createdAt: now + i,
    updatedAt: now,
  }))
  await db.transaction('rw', db.logbooks, db.entries, async () => {
    await db.logbooks.add(logbook)
    await db.entries.bulkAdd(entries)
  })
  return logbook.id
}

export function renameLogbook(id: string, name: string) {
  return db.logbooks.update(id, { name, updatedAt: Date.now() })
}

export function deleteLogbook(id: string) {
  return db.transaction('rw', db.logbooks, db.entries, async () => {
    await db.entries
      .where('[logbookId+createdAt]')
      .between([id, Dexie.minKey], [id, Dexie.maxKey])
      .delete()
    await db.logbooks.delete(id)
  })
}

export function saveColumn(logbookId: string, column: Column) {
  return db.logbooks
    .where('id')
    .equals(logbookId)
    .modify((logbook) => {
      const index = logbook.columns.findIndex((c) => c.id === column.id)
      if (index === -1) logbook.columns.push(column)
      else logbook.columns[index] = column
      logbook.updatedAt = Date.now()
    })
}

export function moveColumn(logbookId: string, columnId: string, offset: -1 | 1) {
  return db.logbooks
    .where('id')
    .equals(logbookId)
    .modify((logbook) => {
      const from = logbook.columns.findIndex((c) => c.id === columnId)
      const to = from + offset
      if (from === -1 || to < 0 || to >= logbook.columns.length) return
      const [column] = logbook.columns.splice(from, 1)
      logbook.columns.splice(to, 0, column!)
      logbook.updatedAt = Date.now()
    })
}

// Entry values for the column are left in place so the data survives if the
// column is recreated or the deletion is undone later.
export function saveBinding(
  logbookId: string,
  processorId: ProcessorId,
  slotKey: string,
  columnId: string | string[],
) {
  return db.logbooks
    .where('id')
    .equals(logbookId)
    .modify((logbook) => {
      logbook.processors ??= {}
      logbook.processors[processorId] = { ...logbook.processors[processorId], [slotKey]: columnId }
    })
}

export function deleteColumn(logbookId: string, columnId: string) {
  return db.logbooks
    .where('id')
    .equals(logbookId)
    .modify((logbook) => {
      logbook.columns = logbook.columns.filter((c) => c.id !== columnId)
      logbook.updatedAt = Date.now()
    })
}

export async function addEntry(logbookId: string): Promise<string> {
  const now = Date.now()
  const entry: Entry = {
    id: crypto.randomUUID(),
    logbookId,
    values: {},
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', db.logbooks, db.entries, async () => {
    await db.entries.add(entry)
    await db.logbooks.update(logbookId, { updatedAt: now })
  })
  return entry.id
}

export function updateCell(entry: Entry, columnId: string, value: CellValue | undefined) {
  const now = Date.now()
  return db.transaction('rw', db.logbooks, db.entries, async () => {
    // Dexie removes the key path when the value is undefined, which clears the cell.
    await db.entries.update(entry.id, { [`values.${columnId}`]: value, updatedAt: now })
    await db.logbooks.update(entry.logbookId, { updatedAt: now })
  })
}

export function deleteEntries(ids: string[]) {
  return db.entries.bulkDelete(ids)
}
