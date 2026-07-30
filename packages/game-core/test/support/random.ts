import type { RandomSource } from '../../src/random'

export function createSeededValues(seed: number, length = 1024): number[] {
  let state = seed >>> 0
  return Array.from({ length }, () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  })
}

export interface TapeRandomSource extends RandomSource {
  readonly consumed: number
}

export function createTapeRandomSource(values: readonly number[]): TapeRandomSource {
  let index = 0
  return {
    get consumed() {
      return index
    },
    next() {
      const value = values[index]
      if (value === undefined) throw new Error(`Random tape exhausted at index ${index}`)
      index += 1
      return value
    },
  }
}
