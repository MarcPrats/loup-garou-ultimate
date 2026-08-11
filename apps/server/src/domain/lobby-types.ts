import type {
  PlayerId,
  PlayerName,
  LobbyId,
  RoleAccessToken,
  RoleAccessView,
  LobbyClosedReason,
  GamePhase,
  LobbyPhase,
  SessionToken,
} from '@lgu/contracts'
import type {
  AssignablePlayer,
  AssignmentResult,
} from '@lgu/game-core'

export type ConnectionId = string

export interface LobbyPlayerState {
  readonly id: PlayerId
  readonly name: PlayerName
  readonly sessionToken: SessionToken
  connectionId: ConnectionId | null
  connected: boolean
  isHost: boolean
  readonly joinedAt: number
  readonly joinOrder: number
  lastSeenAt: number
  disconnectedAt: number | null
  sessionRevoked: boolean
}

export interface RoleAccessGrant {
  readonly playerId: PlayerId
  readonly token: RoleAccessToken
  readonly view: RoleAccessView
}

export interface StoredGameState {
  readonly assignment: AssignmentResult
  readonly roleAccessGrants: RoleAccessGrant[]
  readonly startedAt: number
}

export interface LobbyState {
  readonly id: LobbyId
  phase: LobbyPhase
  revision: number
  players: LobbyPlayerState[]
  readonly createdAt: number
  lastActivityAt: number
  closedAt: number | null
  closeReason: LobbyClosedReason | null
  gamePhase: GamePhase | null
  game: StoredGameState | null
}

export interface Clock {
  now(): number
}

export interface GameAssignmentGenerator {
  assign(players: readonly AssignablePlayer[]): AssignmentResult
}

export interface ValueGenerator {
  next(): string
}

export interface LobbyMutation<T> {
  readonly lobby: LobbyState | null
  readonly result: T
}

export interface LobbyRepository {
  read(): Promise<LobbyState | null>
  mutate<T>(
    operation: (
      lobby: LobbyState | null,
    ) => LobbyMutation<T> | Promise<LobbyMutation<T>>,
  ): Promise<T>
}

export interface AdvanceGamePhaseCommand extends SessionCommand {
  readonly expectedRevision: number
}

export interface SessionCommand {
  readonly sessionToken: SessionToken
  readonly connectionId: ConnectionId
}

export interface ResumeSessionCommand {
  readonly sessionToken: SessionToken
  readonly connectionId: ConnectionId
}

export interface EnterLobbyCommand {
  readonly lobbyId?: LobbyId
  readonly playerName: string
  readonly connectionId: ConnectionId
}
