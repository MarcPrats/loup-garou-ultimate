import type { Clock, ValueGenerator } from '../../src/domain/lobby-types'

export class FakeClock implements Clock {
  constructor(private value = 1_000) {}

  now(): number {
    return this.value
  }

  advance(milliseconds: number): void {
    this.value += milliseconds
  }
}

export class PlayerIdSequence implements ValueGenerator {
  private value = 0

  next(): string {
    this.value += 1
    return `player_${this.value}`
  }
}

export class SessionTokenSequence implements ValueGenerator {
  private value = 0

  next(): string {
    this.value += 1
    return `session_${String(this.value).padStart(40, '0')}`
  }
}
