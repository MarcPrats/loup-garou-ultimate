import type {
  PlayerId,
  PlayerName,
  RoleAccessToken,
  RoleAccessView,
} from '@lgu/contracts'
import type { AssignmentResult } from '@lgu/game-core'

export interface ProjectionPlayer {
  readonly id: PlayerId
  readonly name: PlayerName
  readonly connected: boolean
  readonly isHost: boolean
}

export interface ProjectionRoleAccessGrant {
  readonly playerId: PlayerId
  readonly token: RoleAccessToken
  readonly view: RoleAccessView
}

export interface GameProjectionState {
  readonly players: readonly ProjectionPlayer[]
  readonly assignment: AssignmentResult
  readonly roleAccessGrants: readonly ProjectionRoleAccessGrant[]
}
