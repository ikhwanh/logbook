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
  it('reads 24-hour times as HH:MM', () => {
    const { coerce } = columnTypes.time
    expect(coerce('07:30')).toBe('07:30')
    expect(coerce(' 7:05 ')).toBe('07:05')
    expect(coerce('23:59:30')).toBe('23:59')
    expect(coerce('24:00')).toBeUndefined()
    expect(coerce('7pm')).toBeUndefined()
    expect(coerce(730)).toBeUndefined()
  })

  it('reads days of the week into Mon-first order', () => {
    const { coerce } = columnTypes.days
    expect(coerce('Fri,Mon,Wed')).toBe('Mon,Wed,Fri')
    expect(coerce('monday  TUESDAY, sun')).toBe('Mon,Tue,Sun')
    expect(coerce('Mon,mon')).toBe('Mon')
    expect(coerce('Mon,Funday')).toBeUndefined()
    expect(coerce('')).toBeUndefined()
    expect(coerce(3)).toBeUndefined()
  })
})
