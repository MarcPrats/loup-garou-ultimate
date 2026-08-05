import { randomBytes, randomUUID } from 'node:crypto'

import {
  assignRoles,
  createMathRandomSource,
  type AssignmentResult,
} from '@lgu/game-core'

import type {
  Clock,
  GameAssignmentGenerator,
  ValueGenerator,
} from '../domain/lobby-types'

export class SystemClock implements Clock {
  now(): number {
    return Date.now()
  }
}

export class PlayerIdGenerator implements ValueGenerator {
  next(): string {
    return `player_${randomUUID()}`
  }
}

export class SessionTokenGenerator implements ValueGenerator {
  next(): string {
    return randomBytes(32).toString('base64url')
  }
}

export class RoleAccessTokenGenerator implements ValueGenerator {
  next(): string {
    return randomBytes(32).toString('base64url')
  }
}

export class RoleAssignmentGenerator implements GameAssignmentGenerator {
  assign(
    players: Parameters<GameAssignmentGenerator['assign']>[0],
  ): AssignmentResult {
    return assignRoles(players, createMathRandomSource())
  }
}
