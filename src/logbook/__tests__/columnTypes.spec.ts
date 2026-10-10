import { describe, it, expect } from 'vitest'
import { columnTypes } from '../columnTypes'

describe('columnTypes.coerce', () => {
  it('reads numbers from numeric strings only', () => {
    const { coerce } = columnTypes.number
    expect(coerce(42)).toBe(42)
    expect(coerce(' 3.5 ')).toBe(3.5)
    expect(coerce('')).toBeUndefined()
    expect(coerce('abc')).toBeUndefined()
    expect(coerce(true)).toBeUndefined()
  })

  it('accepts only ISO dates', () => {
    const { coerce } = columnTypes.date
    expect(coerce('2026-10-10')).toBe('2026-10-10')
    expect(coerce('10/10/2026')).toBeUndefined()
    expect(coerce(20261010)).toBeUndefined()
  })

  it('reads checkbox words and numbers', () => {
    const { coerce } = columnTypes.checkbox
    expect(coerce(true)).toBe(true)
    expect(coerce('Yes')).toBe(true)
    expect(coerce('no')).toBe(false)
    expect(coerce(0)).toBe(false)
    expect(coerce('maybe')).toBeUndefined()
  })

  it('reads anything as text', () => {
    expect(columnTypes.text.coerce(12)).toBe('12')
    expect(columnTypes.select.coerce(true)).toBeUndefined()
  })
})
