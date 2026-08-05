import { describe, expect, it } from 'vitest'

import { createSeededRandomSource } from '../src/random'

function sequence(seed: string): number[] {
  const random = createSeededRandomSource(seed)
  return Array.from({ length: 8 }, () => random.next())
}

describe('createSeededRandomSource', () => {
  it('reproduces the same sequence for the same seed', () => {
    expect(sequence('night-42')).toEqual(sequence('night-42'))
  })

  it('changes the sequence when the seed changes', () => {
    expect(sequence('night-42')).not.toEqual(sequence('night-43'))
  })

  it('always returns values in the RandomSource range', () => {
    for (const value of sequence('range-check')) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
