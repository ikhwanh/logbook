import { describe, it, expect } from 'vitest'
import type { CellValue, Column, Entry, Logbook, SortOrder } from '@/db'
import { sortEntries } from '../sort'

function setup(column: Omit<Column, 'id' | 'name'>, values: (CellValue | undefined)[]) {
  const entries = values.map((value, i): Entry => ({
    id: `e${i}`,
    logbookId: 'l',
    values: value === undefined ? {} : { c: value },
    createdAt: i,
    updatedAt: i,
  }))
  const sorted = (sort?: SortOrder) => {
    const logbook: Logbook = {
      id: 'l',
      name: 'L',
      columns: [{ id: 'c', name: 'C', ...column }],
      sort,
      createdAt: 0,
      updatedAt: 0,
    }
    return sortEntries(entries, logbook).map((e) => e.values.c)
  }
  return {
    asc: () => sorted({ columnId: 'c', direction: 'asc' }),
    desc: () => sorted({ columnId: 'c', direction: 'desc' }),
    sorted,
  }
}

describe('sortEntries', () => {
  it('sorts numbers numerically in both directions', () => {
    const { asc, desc } = setup({ type: 'number' }, [10, 2, 33])
    expect(asc()).toEqual([2, 10, 33])
    expect(desc()).toEqual([33, 10, 2])
  })

  it('keeps empty and unreadable cells last in both directions', () => {
    const { asc, desc } = setup({ type: 'number' }, [undefined, 5, 'abc', 1])
    expect(asc()).toEqual([1, 5, undefined, 'abc'])
    expect(desc()).toEqual([5, 1, undefined, 'abc'])
  })

  it('orders select values by their options, then unlisted ones', () => {
    const { asc } = setup({ type: 'select', options: ['Low', 'Mid', 'High'] }, [
      'High',
      'Zed',
      'Low',
      'Abc',
      'Mid',
    ])
    expect(asc()).toEqual(['Low', 'Mid', 'High', 'Abc', 'Zed'])
  })

  it('compares text case-insensitively and numerically', () => {
    const { asc } = setup({ type: 'text' }, ['item 10', 'Banana', 'item 2', 'apple'])
    expect(asc()).toEqual(['apple', 'Banana', 'item 2', 'item 10'])
  })

  it('sorts dates and treats cleared checkboxes as unticked', () => {
    expect(setup({ type: 'date' }, ['2026-03-01', '2025-12-31']).asc()).toEqual([
      '2025-12-31',
      '2026-03-01',
    ])
    expect(setup({ type: 'checkbox' }, [true, undefined, true]).desc()).toEqual([
      true,
      true,
      undefined,
    ])
    expect(setup({ type: 'checkbox' }, [true, undefined, true]).asc()).toEqual([
      undefined,
      true,
      true,
    ])
  })

  it('keeps creation order for ties', () => {
    const { desc } = setup({ type: 'text' }, ['b', 'a', 'B'])
    expect(desc()).toEqual(['b', 'B', 'a'])
  })

  it('leaves the order alone without a sort or when its column is gone', () => {
    const { sorted } = setup({ type: 'number' }, [3, 1, 2])
    expect(sorted()).toEqual([3, 1, 2])
    expect(sorted({ columnId: 'gone', direction: 'asc' })).toEqual([3, 1, 2])
  })
})
