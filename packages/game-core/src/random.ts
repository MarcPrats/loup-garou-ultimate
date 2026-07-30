export interface RandomSource {
  next(): number
}

function nextValue(random: RandomSource): number {
  const value = random.next()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(`RandomSource.next() must return a value in [0, 1), received ${value}`)
  }
  return value
}

export function randomIndex(length: number, random: RandomSource): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError(`Cannot select a random index from length ${length}`)
  }
  return Math.floor(nextValue(random) * length)
}

export function pickRandom<T>(items: readonly T[], random: RandomSource): T {
  const item = items[randomIndex(items.length, random)]
  if (item === undefined) throw new Error('Random selection unexpectedly returned no item')
  return item
}

export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random)
    const current = result[index]
    const replacement = result[swapIndex]
    if (current === undefined || replacement === undefined) {
      throw new Error('Shuffle indexes are outside the array')
    }
    result[index] = replacement
    result[swapIndex] = current
  }
  return result
}

export function createMathRandomSource(): RandomSource {
  return { next: () => Math.random() }
}
