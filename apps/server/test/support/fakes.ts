import { assignRoles, type AssignablePlayer, type AssignmentResult } from '@lgu/game-core'

import type {
  Clock,
  GameAssignmentGenerator,
  ValueGenerator,
} from '../../src/domain/lobby-types'

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

export class RoleAccessTokenSequence implements ValueGenerator {
  private value = 0

  next(): string {
    this.value += 1
    return `role_${String(this.value).padStart(40, '0')}`
  }
}

export class DeterministicAssignmentGenerator implements GameAssignmentGenerator {
  calls = 0

  assign(players: readonly AssignablePlayer[]): AssignmentResult {
    this.calls += 1
    return assignRoles(players, { next: () => 0.314159 })
  }
}

export class ThrowingAssignmentGenerator implements GameAssignmentGenerator {
  calls = 0

  assign(_players: readonly AssignablePlayer[]): AssignmentResult {
    this.calls += 1
    throw new Error('Assignment generation failed')
  }
}
