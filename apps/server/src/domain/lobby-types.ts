import type {
  PlayerId,
  PlayerName,
  LobbyId,
  RoleAccessToken,
  RoleAccessView,
  LobbyClosedReason,
  GameLogEntry,
  GamePhase,
  LobbyPhase,
  SessionToken,
  DayVoteChoice,
} from '@lgu/contracts'
import type {
  AssignablePlayer,
  AssignmentResult,
} from '@lgu/game-core'
import type { DayVotingState } from './day-voting/day-voting-state'
export type { DayVotingState } from './day-voting/day-voting-state'
export type { AssignmentResult } from '@lgu/game-core'

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
  gameLog: GameLogEntry[]
  gameEnded: boolean
  dayVoting: DayVotingState
  ghostFinalVoteUsedIds: PlayerId[]
}

export interface GameStartPreviewState {
  readonly assignment: AssignmentResult
  readonly preparedAt: number
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
  dayVotingEnabled: boolean
  gameStartPreview: GameStartPreviewState | null
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

export interface RecordGameLogEventCommand extends SessionCommand {
  readonly expectedRevision: number
  readonly eventType: GameLogEntry['eventType']
  readonly targetPlayerId: PlayerId
}

export interface EditGameLogEventCommand extends SessionCommand {
  readonly expectedRevision: number
  readonly eventId: string
  readonly targetPlayerId: PlayerId
}

export interface DeleteGameLogEventCommand extends SessionCommand {
  readonly expectedRevision: number
  readonly eventId: string
}

export interface DayNominationProposeServerCommand extends SessionCommand {
  readonly expectedRevision: number
  readonly targetPlayerId: PlayerId
}

export interface DayNominationDecisionServerCommand extends SessionCommand {
  readonly expectedRevision: number
  readonly nominationId: string
}

export interface DayVotingEnabledServerCommand extends SessionCommand {
  readonly expectedRevision: number
  readonly enabled: boolean
}

export interface DayVoteSubmitServerCommand extends SessionCommand {
  readonly expectedRevision: number
  readonly choice: DayVoteChoice
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
