import { randomBytes, randomUUID } from 'node:crypto'

import type { Clock, ValueGenerator } from '../domain/lobby-types'

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
