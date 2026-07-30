import type { ErrorCode } from '@lgu/contracts'

export class LobbyError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'LobbyError'
  }
}
