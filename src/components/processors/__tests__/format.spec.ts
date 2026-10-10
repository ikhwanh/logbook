import { describe, it, expect } from 'vitest'
import { niceTicks } from '../format'

describe('niceTicks', () => {
  it('covers the whole range with round steps', () => {
    expect(niceTicks(305_800, 529_200)).toEqual([300_000, 400_000, 500_000, 600_000])
    expect(niceTicks(27.8, 44.4)).toEqual([25, 30, 35, 40, 45])
  })

  it('handles a flat range and float steps', () => {
    expect(niceTicks(5, 5)).toEqual([0, 2.5, 5, 7.5, 10])
    expect(niceTicks(0.1, 0.3)).toEqual([0.1, 0.15, 0.2, 0.25, 0.3])
  })
})
