import { columnTypeIds } from '@/logbook/columnTypes'
import type { ProcessorId } from '@/processors/types'
import { db, type CellValue, type Column, type ColumnType, type Entry, type Logbook } from './index'
import { listEntries, listLogbooks } from './logbooks'

const FORMAT = 'logbook-export'
const VERSION = 1

export interface ExportFile {
  format: typeof FORMAT
  version: typeof VERSION
  exportedAt: number
  logbooks: { logbook: Logbook; entries: Entry[] }[]
}

export class ImportError extends Error {
  override name = 'ImportError'
}

export function exportLogbooks(ids?: string[]): Promise<ExportFile> {
  return db.transaction('r', db.logbooks, db.entries, async () => {
    const logbooks = ids
      ? (await db.logbooks.bulkGet(ids)).filter((logbook) => logbook !== undefined)
      : await listLogbooks()
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: Date.now(),
      logbooks: await Promise.all(
        logbooks.map(async (logbook) => ({ logbook, entries: await listEntries(logbook.id) })),
      ),
    }
  })
}

export async function importLogbooks(file: ExportFile): Promise<string[]> {
  const now = Date.now()
  const logbooks: Logbook[] = []
  const entries: Entry[] = []
  // Fresh ids so an import never collides with or overwrites existing data.
  // Column ids are kept: they are only referenced within their own logbook.
  file.logbooks.forEach((item, i) => {
    const logbookId = crypto.randomUUID()
    // Counting down keeps the exported order in the home list, which sorts by updatedAt.
    logbooks.push({ ...item.logbook, id: logbookId, updatedAt: now - i })
    for (const entry of item.entries) {
      entries.push({ ...entry, id: crypto.randomUUID(), logbookId })
    }
  })
  await db.transaction('rw', db.logbooks, db.entries, async () => {
    await db.logbooks.bulkAdd(logbooks)
    await db.entries.bulkAdd(entries)
  })
  return logbooks.map((logbook) => logbook.id)
}

type JsonObject = Record<string, unknown>

function fail(message: string): never {
  throw new ImportError(message)
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, what: string): string {
  return typeof value === 'string' ? value : fail(`${what} is missing.`)
}

function time(value: unknown, what: string): number {
  return typeof value === 'number' ? value : fail(`${what} is missing.`)
}

function isCellValue(value: unknown): value is CellValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function parseColumn(value: unknown, logbookName: string): Column {
  if (!isObject(value)) fail(`A column in "${logbookName}" is malformed.`)
  const type = value.type as ColumnType
  if (!columnTypeIds.includes(type)) {
    fail(`A column in "${logbookName}" has an unknown type "${String(value.type)}".`)
  }
  const column: Column = {
    id: text(value.id, `A column id in "${logbookName}"`),
    name: text(value.name, `A column name in "${logbookName}"`),
    type,
  }
  if (value.options !== undefined) {
    const options = value.options
    if (!Array.isArray(options) || !options.every((option) => typeof option === 'string')) {
      fail(`The options of column "${column.name}" are malformed.`)
    }
    column.options = options
  }
  return column
}

function parseBindings(value: unknown, logbookName: string): Logbook['processors'] {
  if (value === undefined) return undefined
  const malformed = `The view settings of "${logbookName}" are malformed.`
  if (!isObject(value)) fail(malformed)
  const bindings: NonNullable<Logbook['processors']> = {}
  for (const [processorId, slots] of Object.entries(value)) {
    if (!isObject(slots) || !Object.values(slots).every((id) => typeof id === 'string')) {
      fail(malformed)
    }
    bindings[processorId as ProcessorId] = slots as Record<string, string>
  }
  return bindings
}

function parseLogbook(value: unknown): Logbook {
  if (!isObject(value)) fail('A logbook is malformed.')
  const name = text(value.name, 'A logbook name')
  if (!Array.isArray(value.columns)) fail(`The columns of "${name}" are missing.`)
  const logbook: Logbook = {
    id: text(value.id, `The id of "${name}"`),
    name,
    columns: value.columns.map((column) => parseColumn(column, name)),
    createdAt: time(value.createdAt, `The creation time of "${name}"`),
    updatedAt: time(value.updatedAt, `The update time of "${name}"`),
  }
  const processors = parseBindings(value.processors, name)
  if (processors) logbook.processors = processors
  return logbook
}

function parseEntry(value: unknown, logbook: Logbook): Entry {
  const malformed = `A row in "${logbook.name}" is malformed.`
  if (!isObject(value) || !isObject(value.values)) fail(malformed)
  const values = value.values
  if (!Object.values(values).every(isCellValue)) fail(malformed)
  return {
    id: text(value.id, `A row id in "${logbook.name}"`),
    logbookId: logbook.id,
    values: values as Record<string, CellValue>,
    createdAt: time(value.createdAt, `A row's creation time in "${logbook.name}"`),
    updatedAt: time(value.updatedAt, `A row's update time in "${logbook.name}"`),
  }
}

// Builds fresh objects with only known fields so stray properties in the file
// never reach IndexedDB.
export function parseExport(json: string): ExportFile {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    fail('The file is not valid JSON.')
  }
  if (!isObject(data) || data.format !== FORMAT) fail('The file is not a logbook export.')
  if (typeof data.version !== 'number' || data.version > VERSION) {
    fail('The file was made by a newer version of the app.')
  }
  if (!Array.isArray(data.logbooks)) fail('The file has no logbooks.')
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: time(data.exportedAt, 'The export time'),
    logbooks: data.logbooks.map((item: unknown) => {
      if (!isObject(item) || !Array.isArray(item.entries)) fail('A logbook is malformed.')
      const logbook = parseLogbook(item.logbook)
      return { logbook, entries: item.entries.map((entry) => parseEntry(entry, logbook)) }
    }),
  }
}
