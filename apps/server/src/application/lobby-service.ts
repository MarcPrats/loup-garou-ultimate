import {
  ERROR_CODE,
  ROOM_CLOSED_REASON,
  ROOM_ID,
  ROOM_PHASE,
  playerIdSchema,
  playerNameSchema,
  sessionTokenSchema,
  type RoomEntryResponse,
  type RoomSnapshot,
  type SessionResumeResponse,
} from '@lgu/contracts'
import { PLAYER_COUNT } from '@lgu/game-core'

import { LOBBY_TIME_LIMIT } from '../config/lobby-constants'
import { LobbyError } from '../domain/lobby-error'
import type {
  Clock,
  ConnectionId,
  EnterRoomCommand,
  LobbyPlayerState,
  LobbyRoomState,
  ResumeSessionCommand,
  RoomRepository,
  SessionCommand,
  ValueGenerator,
} from '../domain/lobby-types'
import {
  canStartRoom,
  getRegularPlayerCount,
  getSessionDestination,
  toRoomSnapshot,
} from './room-mapper'

export interface LobbyServiceDependencies {
  readonly repository: RoomRepository
  readonly clock: Clock
  readonly playerIdGenerator: ValueGenerator
  readonly sessionTokenGenerator: ValueGenerator
}

export interface ResumeResult {
  readonly response: SessionResumeResponse
  readonly replacedConnectionId: ConnectionId | null
}

export interface RoomChangeResult {
  readonly room: RoomSnapshot | null
  readonly playerId: string
}

export interface DisconnectResult {
  readonly room: RoomSnapshot | null
  readonly playerId: string | null
  readonly changed: boolean
}

export interface CleanupResult {
  readonly room: RoomSnapshot | null
  readonly removedPlayerIds: readonly string[]
  readonly roomExpired: boolean
  readonly roomPurged: boolean
}

function touchRoom(room: LobbyRoomState, now: number): void {
  room.revision += 1
  room.lastActivityAt = now
}

function closeRoom(
  room: LobbyRoomState,
  now: number,
  reason: (typeof ROOM_CLOSED_REASON)[keyof typeof ROOM_CLOSED_REASON],
): void {
  room.phase = ROOM_PHASE.CLOSED
  room.closedAt = now
  room.closeReason = reason
  touchRoom(room, now)
}

function assertConnectionId(connectionId: ConnectionId): void {
  if (!connectionId.trim()) {
    throw new LobbyError(ERROR_CODE.INVALID_PAYLOAD, 'Connection ID cannot be empty.')
  }
}

function findSessionPlayer(
  room: LobbyRoomState,
  sessionToken: string,
): LobbyPlayerState {
  const player = room.players.find((candidate) => candidate.sessionToken === sessionToken)
  if (!player) {
    throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
  }
  return player
}

function authenticateConnectedSession(
  room: LobbyRoomState,
  command: SessionCommand,
): LobbyPlayerState {
  const player = findSessionPlayer(room, command.sessionToken)
  if (!player.connected || player.connectionId !== command.connectionId) {
    throw new LobbyError(
      ERROR_CODE.SESSION_NOT_FOUND,
      'Cette connexion ne correspond pas à la session active.',
    )
  }
  return player
}

function assertRoomOpen(room: LobbyRoomState): void {
  if (room.phase === ROOM_PHASE.CLOSED) {
    throw new LobbyError(ERROR_CODE.ROOM_CLOSED, 'La partie est fermée.')
  }
}

function assertLobbyPhase(room: LobbyRoomState): void {
  assertRoomOpen(room)
  if (room.phase !== ROOM_PHASE.LOBBY) {
    throw new LobbyError(
      ERROR_CODE.GAME_ALREADY_STARTED,
      'La partie a déjà commencé.',
    )
  }
}

function assertHost(player: LobbyPlayerState): void {
  if (!player.isHost) {
    throw new LobbyError(
      ERROR_CODE.NOT_GAME_MASTER,
      'Seul le maître du jeu peut effectuer cette action.',
    )
  }
}

function electHost(room: LobbyRoomState): LobbyPlayerState | null {
  const existingHost = room.players.find((player) => player.isHost)
  if (existingHost) return existingHost

  const nextHost = [...room.players]
    .filter((player) => player.connected)
    .sort((left, right) => left.joinOrder - right.joinOrder)[0]

  if (nextHost) nextHost.isHost = true
  return nextHost ?? null
}

function createPlayer(
  name: string,
  connectionId: ConnectionId,
  joinedAt: number,
  joinOrder: number,
  isHost: boolean,
  playerIdGenerator: ValueGenerator,
  sessionTokenGenerator: ValueGenerator,
): LobbyPlayerState {
  return {
    id: playerIdSchema.parse(playerIdGenerator.next()),
    name: playerNameSchema.parse(name),
    sessionToken: sessionTokenSchema.parse(sessionTokenGenerator.next()),
    connectionId,
    connected: true,
    isHost,
    joinedAt,
    joinOrder,
    lastSeenAt: joinedAt,
    disconnectedAt: null,
  }
}

function toEntryResponse(
  room: LobbyRoomState,
  player: LobbyPlayerState,
): RoomEntryResponse {
  return {
    session: {
      playerId: player.id,
      sessionToken: player.sessionToken,
    },
    room: toRoomSnapshot(room),
    destination: getSessionDestination(room, player),
  }
}

export class LobbyService {
  constructor(private readonly dependencies: LobbyServiceDependencies) {}

  async getRoomSnapshot(): Promise<RoomSnapshot | null> {
    const room = await this.dependencies.repository.read()
    return room ? toRoomSnapshot(room) : null
  }

  enter(command: EnterRoomCommand): Promise<RoomEntryResponse> {
    assertConnectionId(command.connectionId)
    const parsedName = playerNameSchema.safeParse(command.playerName)
    if (!parsedName.success) {
      throw new LobbyError(
        ERROR_CODE.INVALID_PLAYER_NAME,
        'Le nom du joueur est invalide.',
      )
    }

    return this.dependencies.repository.mutate<RoomEntryResponse>((room) => {
      const now = this.dependencies.clock.now()

      if (!room) {
        const host = createPlayer(
          parsedName.data,
          command.connectionId,
          now,
          0,
          true,
          this.dependencies.playerIdGenerator,
          this.dependencies.sessionTokenGenerator,
        )
        const createdRoom: LobbyRoomState = {
          id: ROOM_ID.MAIN,
          phase: ROOM_PHASE.LOBBY,
          revision: 1,
          players: [host],
          createdAt: now,
          lastActivityAt: now,
          closedAt: null,
          closeReason: null,
        }
        return { room: createdRoom, result: toEntryResponse(createdRoom, host) }
      }

      assertLobbyPhase(room)
      const duplicateName = room.players.some(
        (player) => player.name.toLocaleLowerCase('fr')
          === parsedName.data.toLocaleLowerCase('fr'),
      )
      if (duplicateName) {
        throw new LobbyError(
          ERROR_CODE.INVALID_PLAYER_NAME,
          'Ce nom est déjà utilisé dans la salle.',
        )
      }

      const willBecomeHost = !room.players.some((player) => player.isHost)
      if (!willBecomeHost && getRegularPlayerCount(room) >= PLAYER_COUNT.MAXIMUM) {
        throw new LobbyError(ERROR_CODE.ROOM_FULL, 'La salle est complète.')
      }

      const player = createPlayer(
        parsedName.data,
        command.connectionId,
        now,
        Math.max(-1, ...room.players.map((candidate) => candidate.joinOrder)) + 1,
        false,
        this.dependencies.playerIdGenerator,
        this.dependencies.sessionTokenGenerator,
      )
      room.players.push(player)
      electHost(room)
      touchRoom(room, now)

      return { room, result: toEntryResponse(room, player) }
    })
  }

  resume(command: ResumeSessionCommand): Promise<ResumeResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<ResumeResult>((room) => {
      if (!room) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertRoomOpen(room)

      const player = findSessionPlayer(room, command.sessionToken)
      const now = this.dependencies.clock.now()
      const replacedConnectionId = player.connected
        && player.connectionId !== command.connectionId
        ? player.connectionId
        : null
      const publicStateChanged = !player.connected

      player.connectionId = command.connectionId
      player.connected = true
      player.lastSeenAt = now
      player.disconnectedAt = null

      const hostBeforeResume = room.players.find((candidate) => candidate.isHost)
      if (!hostBeforeResume) electHost(room)
      const hostChanged = !hostBeforeResume && player.isHost

      if (publicStateChanged || hostChanged) touchRoom(room, now)

      return {
        room,
        result: {
          response: toEntryResponse(room, player),
          replacedConnectionId,
        },
      }
    })
  }

  keepAlive(command: SessionCommand): Promise<void> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<void>((room) => {
      if (!room) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertRoomOpen(room)
      const player = authenticateConnectedSession(room, command)
      player.lastSeenAt = this.dependencies.clock.now()
      return { room, result: undefined }
    })
  }

  disconnect(connectionId: ConnectionId): Promise<DisconnectResult> {
    assertConnectionId(connectionId)
    return this.dependencies.repository.mutate<DisconnectResult>((room) => {
      if (!room) {
        return {
          room: null,
          result: { room: null, playerId: null, changed: false },
        }
      }

      const player = room.players.find(
        (candidate) => candidate.connectionId === connectionId,
      )
      if (!player) {
        return {
          room,
          result: {
            room: toRoomSnapshot(room),
            playerId: null,
            changed: false,
          },
        }
      }

      const now = this.dependencies.clock.now()
      player.connectionId = null
      player.connected = false
      player.lastSeenAt = now
      player.disconnectedAt = now
      touchRoom(room, now)

      return {
        room,
        result: {
          room: toRoomSnapshot(room),
          playerId: player.id,
          changed: true,
        },
      }
    })
  }

  leave(command: SessionCommand): Promise<RoomChangeResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<RoomChangeResult>((room) => {
      if (!room) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }

      const player = authenticateConnectedSession(room, command)
      const now = this.dependencies.clock.now()

      if (room.phase === ROOM_PHASE.STARTED && player.isHost) {
        player.connectionId = null
        player.connected = false
        player.lastSeenAt = now
        player.disconnectedAt = now
        closeRoom(room, now, ROOM_CLOSED_REASON.HOST_LEFT)
        return {
          room,
          result: { room: toRoomSnapshot(room), playerId: player.id },
        }
      }

      room.players = room.players.filter((candidate) => candidate.id !== player.id)
      if (room.players.length === 0) {
        return { room: null, result: { room: null, playerId: player.id } }
      }

      if (player.isHost) electHost(room)
      touchRoom(room, now)
      return {
        room,
        result: { room: toRoomSnapshot(room), playerId: player.id },
      }
    })
  }

  kick(command: SessionCommand, targetPlayerId: string): Promise<RoomChangeResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<RoomChangeResult>((room) => {
      if (!room) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyPhase(room)

      const host = authenticateConnectedSession(room, command)
      assertHost(host)
      const target = room.players.find((player) => player.id === targetPlayerId)
      if (!target) {
        throw new LobbyError(ERROR_CODE.PLAYER_NOT_FOUND, 'Joueur introuvable.')
      }
      if (target.isHost) {
        throw new LobbyError(
          ERROR_CODE.NOT_GAME_MASTER,
          'Le maître du jeu ne peut pas être expulsé.',
        )
      }

      room.players = room.players.filter((player) => player.id !== target.id)
      touchRoom(room, this.dependencies.clock.now())
      return {
        room,
        result: { room: toRoomSnapshot(room), playerId: target.id },
      }
    })
  }

  start(command: SessionCommand): Promise<RoomSnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<RoomSnapshot>((room) => {
      if (!room) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyPhase(room)

      const host = authenticateConnectedSession(room, command)
      assertHost(host)
      if (room.players.some((player) => !player.connected)) {
        throw new LobbyError(
          ERROR_CODE.PLAYERS_DISCONNECTED,
          'Tous les joueurs doivent être connectés.',
        )
      }
      if (!canStartRoom(room)) {
        throw new LobbyError(
          ERROR_CODE.NOT_ENOUGH_PLAYERS,
          `Au moins ${PLAYER_COUNT.MINIMUM} joueurs sont nécessaires.`,
        )
      }

      room.phase = ROOM_PHASE.STARTED
      touchRoom(room, this.dependencies.clock.now())
      return { room, result: toRoomSnapshot(room) }
    })
  }

  cleanup(): Promise<CleanupResult> {
    return this.dependencies.repository.mutate<CleanupResult>((room) => {
      if (!room) {
        return {
          room: null,
          result: {
            room: null,
            removedPlayerIds: [],
            roomExpired: false,
            roomPurged: false,
          },
        }
      }

      const now = this.dependencies.clock.now()
      if (
        room.phase === ROOM_PHASE.CLOSED
        && room.closedAt !== null
        && now - room.closedAt >= LOBBY_TIME_LIMIT.CLOSED_ROOM_RETENTION_MS
      ) {
        return {
          room: null,
          result: {
            room: null,
            removedPlayerIds: [],
            roomExpired: false,
            roomPurged: true,
          },
        }
      }

      if (
        room.phase !== ROOM_PHASE.CLOSED
        && now - room.createdAt >= LOBBY_TIME_LIMIT.ROOM_MAX_AGE_MS
      ) {
        closeRoom(room, now, ROOM_CLOSED_REASON.EXPIRED)
        return {
          room,
          result: {
            room: toRoomSnapshot(room),
            removedPlayerIds: [],
            roomExpired: true,
            roomPurged: false,
          },
        }
      }

      if (room.phase !== ROOM_PHASE.LOBBY) {
        return {
          room,
          result: {
            room: toRoomSnapshot(room),
            removedPlayerIds: [],
            roomExpired: false,
            roomPurged: false,
          },
        }
      }

      const removedPlayers = room.players.filter(
        (player) => !player.connected
          && player.disconnectedAt !== null
          && now - player.disconnectedAt
            >= LOBBY_TIME_LIMIT.DISCONNECTED_SESSION_GRACE_MS,
      )
      if (removedPlayers.length === 0) {
        return {
          room,
          result: {
            room: toRoomSnapshot(room),
            removedPlayerIds: [],
            roomExpired: false,
            roomPurged: false,
          },
        }
      }

      const removedPlayerIds = removedPlayers.map((player) => player.id)
      room.players = room.players.filter(
        (player) => !removedPlayerIds.includes(player.id),
      )
      if (room.players.length === 0) {
        return {
          room: null,
          result: {
            room: null,
            removedPlayerIds,
            roomExpired: false,
            roomPurged: false,
          },
        }
      }

      const hasHost = room.players.some((player) => player.isHost)
      if (!hasHost) electHost(room)
      touchRoom(room, now)

      return {
        room,
        result: {
          room: toRoomSnapshot(room),
          removedPlayerIds,
          roomExpired: false,
          roomPurged: false,
        },
      }
    })
  }
}
