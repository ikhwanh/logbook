import type { Entry } from '@/db'
import { readCell } from './binding'
import type { Processor } from './types'

export interface ChecklistItem {
  entry: Entry
  label: string
  done: boolean
}

export interface ChecklistResult {
  items: ChecklistItem[]
  done: number
  total: number
}

export const checklist: Processor<ChecklistResult> = {
  id: 'checklist',
  name: 'Checklist',
  description: 'Tick items off and track progress',
  slots: [
    { key: 'item', label: 'Item', type: 'text' },
    { key: 'done', label: 'Done', type: 'checkbox' },
  ],
  isEmpty: (result) => result.total === 0,
  run(entries, columns) {
    const items = entries
      .map((entry) => ({
        entry,
        label: String(readCell(entry, columns.item!) ?? '').trim(),
        done: readCell(entry, columns.done!) === true,
      }))
      .filter((item) => item.label !== '')
    return { items, done: items.filter((item) => item.done).length, total: items.length }
  },
}
