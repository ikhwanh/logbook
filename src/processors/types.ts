import type { CellValue, Column, ColumnType, Entry } from '@/db'

export type ProcessorId = 'chart' | 'checklist' | 'timeline' | 'totals' | 'streaks'

export interface Slot {
  key: string
  label: string
  type: ColumnType
  alternateTypes?: ColumnType[]
  optional?: boolean
  // Binds any number of columns, chosen by the user and never auto-picked.
  multiple?: boolean
}

export interface Processor<Result = unknown> {
  id: ProcessorId
  name: string
  description: string
  slots: Slot[]
  run(entries: Entry[], columns: Record<string, Column>, multi?: Record<string, Column[]>): Result
  isEmpty(result: Result): boolean
}

export interface ExampleTemplate {
  name: string
  processorId: ProcessorId
  columns: Column[]
  // Keyed by column id.
  rows: Record<string, CellValue>[]
}
