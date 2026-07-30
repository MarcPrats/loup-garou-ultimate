import type {
  PlayerId,
  PlayerName,
  RoomClosedReason,
  RoomPhase,
  SessionToken,
} from '@lgu/contracts'

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
}

export interface LobbyRoomState {
  readonly id: 'main'
  phase: RoomPhase
  revision: number
  players: LobbyPlayerState[]
  readonly createdAt: number
  lastActivityAt: number
  closedAt: number | null
  closeReason: RoomClosedReason | null
}

export interface Clock {
  now(): number
}

export interface ValueGenerator {
  next(): string
}

export interface RoomMutation<T> {
  readonly room: LobbyRoomState | null
  readonly result: T
}

export interface RoomRepository {
  read(): Promise<LobbyRoomState | null>
  mutate<T>(
    operation: (
      room: LobbyRoomState | null,
    ) => RoomMutation<T> | Promise<RoomMutation<T>>,
  ): Promise<T>
}

export interface SessionCommand {
  readonly sessionToken: SessionToken
  readonly connectionId: ConnectionId
}

export interface ResumeSessionCommand {
  readonly sessionToken: SessionToken
  readonly connectionId: ConnectionId
}

export interface EnterRoomCommand {
  readonly playerName: string
  readonly connectionId: ConnectionId
}
