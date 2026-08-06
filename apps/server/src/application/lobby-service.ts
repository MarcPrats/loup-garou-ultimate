import {
  ERROR_CODE,
  LOBBY_CLOSED_REASON,
  LOBBY_ID,
  LOBBY_PHASE,
  playerIdSchema,
  playerNameSchema,
  roleAccessTokenSchema,
  sessionTokenSchema,
  type HostDashboard,
  type PlayerId,
  type PrivateAssignment,
  type RoleAccessResponse,
  type LobbyEntryResponse,
  type LobbySnapshot,
  type SessionResumeResponse,
} from '@lgu/contracts'
import { PLAYER_COUNT } from '@lgu/game-core'

import { LOBBY_TIME_LIMIT } from '../config/lobby-constants'
import { LobbyError } from '../domain/lobby-error'
import type {
  Clock,
  ConnectionId,
  EnterLobbyCommand,
  GameAssignmentGenerator,
  LobbyPlayerState,
  LobbyState,
  ResumeSessionCommand,
  LobbyRepository,
  SessionCommand,
  ValueGenerator,
} from '../domain/lobby-types'
import {
  canStartLobby,
  getRegularPlayerCount,
  getSessionDestination,
  toLobbySnapshot,
} from './lobby-mapper'
import { createStoredGameState } from './game-state'
import {
  toHostDashboard,
  toPrivateAssignment,
  toRoleAccessResponse,
} from './game-view-mapper'

export interface LobbyServiceDependencies {
  readonly repository: LobbyRepository
  readonly clock: Clock
  readonly playerIdGenerator: ValueGenerator
  readonly sessionTokenGenerator: ValueGenerator
  readonly roleAccessTokenGenerator: ValueGenerator
  readonly assignmentGenerator: GameAssignmentGenerator
}

export interface ResumeResult {
  readonly response: SessionResumeResponse
  readonly replacedConnectionId: ConnectionId | null
  readonly publicStateChanged: boolean
}

export interface LobbyChangeResult {
  readonly lobby: LobbySnapshot | null
  readonly playerId: PlayerId
  readonly connectionId: ConnectionId | null
  readonly lobbyClosedReason: LobbyState['closeReason']
}

export interface PrivateAssignmentDelivery {
  readonly connectionId: ConnectionId
  readonly assignment: PrivateAssignment
}

export interface HostDashboardDelivery {
  readonly connectionId: ConnectionId
  readonly dashboard: HostDashboard
}

export interface StartGameResult {
  readonly lobby: LobbySnapshot
  readonly startedAt: number
  readonly privateAssignments: readonly PrivateAssignmentDelivery[]
  readonly hostDashboard: HostDashboardDelivery
}

export interface DisconnectResult {
  readonly lobby: LobbySnapshot | null
  readonly playerId: string | null
  readonly changed: boolean
}

export interface CleanupResult {
  readonly lobby: LobbySnapshot | null
  readonly removedPlayerIds: readonly string[]
  readonly lobbyExpired: boolean
  readonly lobbyPurged: boolean
}

function touchLobby(lobby: LobbyState, now: number): void {
  lobby.revision += 1
  lobby.lastActivityAt = now
}

function closeLobby(
  lobby: LobbyState,
  now: number,
  reason: (typeof LOBBY_CLOSED_REASON)[keyof typeof LOBBY_CLOSED_REASON],
): void {
  lobby.phase = LOBBY_PHASE.CLOSED
  lobby.closedAt = now
  lobby.closeReason = reason
  touchLobby(lobby, now)
}

function assertConnectionId(connectionId: ConnectionId): void {
  if (!connectionId.trim()) {
    throw new LobbyError(ERROR_CODE.INVALID_PAYLOAD, 'Connection ID cannot be empty.')
  }
}

function findSessionPlayer(
  lobby: LobbyState,
  sessionToken: string,
): LobbyPlayerState {
  const player = lobby.players.find(
    (candidate) => candidate.sessionToken === sessionToken
      && !candidate.sessionRevoked,
  )
  if (!player) {
    throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
  }
  return player
}

function authenticateConnectedSession(
  lobby: LobbyState,
  command: SessionCommand,
): LobbyPlayerState {
  const player = findSessionPlayer(lobby, command.sessionToken)
  if (!player.connected || player.connectionId !== command.connectionId) {
    throw new LobbyError(
      ERROR_CODE.SESSION_NOT_FOUND,
      'Cette connexion ne correspond pas à la session active.',
    )
  }
  return player
}

function assertLobbyOpen(lobby: LobbyState): void {
  if (lobby.phase === LOBBY_PHASE.CLOSED) {
    throw new LobbyError(ERROR_CODE.LOBBY_CLOSED, 'La partie est fermée.')
  }
}

function assertStartedGame(lobby: LobbyState): void {
  assertLobbyOpen(lobby)
  if (lobby.phase !== LOBBY_PHASE.STARTED || !lobby.game) {
    throw new LobbyError(
      ERROR_CODE.GAME_NOT_STARTED,
      'La partie n’a pas encore commencé.',
    )
  }
}

function assertLobbyPhase(lobby: LobbyState): void {
  assertLobbyOpen(lobby)
  if (lobby.phase !== LOBBY_PHASE.LOBBY) {
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

function electHost(lobby: LobbyState): LobbyPlayerState | null {
  const existingHost = lobby.players.find((player) => player.isHost)
  if (existingHost) return existingHost

  const nextHost = [...lobby.players]
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
    sessionRevoked: false,
  }
}

function toEntryResponse(
  lobby: LobbyState,
  player: LobbyPlayerState,
): LobbyEntryResponse {
  return {
    session: {
      lobbyId: lobby.id,
      playerId: player.id,
      sessionToken: player.sessionToken,
    },
    lobby: toLobbySnapshot(lobby),
    destination: getSessionDestination(lobby, player),
  }
}

export class LobbyService {
  constructor(private readonly dependencies: LobbyServiceDependencies) {}

  async getLobbySnapshot(): Promise<LobbySnapshot | null> {
    const lobby = await this.dependencies.repository.read()
    return lobby ? toLobbySnapshot(lobby) : null
  }

  enter(command: EnterLobbyCommand): Promise<LobbyEntryResponse> {
    assertConnectionId(command.connectionId)
    const parsedName = playerNameSchema.safeParse(command.playerName)
    if (!parsedName.success) {
      throw new LobbyError(
        ERROR_CODE.INVALID_PLAYER_NAME,
        'Le nom du joueur est invalide.',
      )
    }

    return this.dependencies.repository.mutate<LobbyEntryResponse>((lobby) => {
      const now = this.dependencies.clock.now()

      if (!lobby) {
        const host = createPlayer(
          parsedName.data,
          command.connectionId,
          now,
          0,
          true,
          this.dependencies.playerIdGenerator,
          this.dependencies.sessionTokenGenerator,
        )
        const createdLobby: LobbyState = {
          id: command.lobbyId ?? LOBBY_ID.MAIN,
          phase: LOBBY_PHASE.LOBBY,
          revision: 1,
          players: [host],
          createdAt: now,
          lastActivityAt: now,
          closedAt: null,
          closeReason: null,
          game: null,
        }
        return { lobby: createdLobby, result: toEntryResponse(createdLobby, host) }
      }

      assertLobbyPhase(lobby)
      if (lobby.players.some(
        (player) => player.connected
          && player.connectionId === command.connectionId,
      )) {
        throw new LobbyError(
          ERROR_CODE.INVALID_PAYLOAD,
          'Cette connexion possède déjà une session active.',
        )
      }
      const duplicateName = lobby.players.some(
        (player) => player.name.toLocaleLowerCase('fr')
          === parsedName.data.toLocaleLowerCase('fr'),
      )
      if (duplicateName) {
        throw new LobbyError(
          ERROR_CODE.INVALID_PLAYER_NAME,
          'Ce nom est déjà utilisé dans le lobby.',
        )
      }

      const willBecomeHost = !lobby.players.some((player) => player.isHost)
      if (!willBecomeHost && getRegularPlayerCount(lobby) >= PLAYER_COUNT.MAXIMUM) {
        throw new LobbyError(ERROR_CODE.LOBBY_FULL, 'Le lobby est complète.')
      }

      const player = createPlayer(
        parsedName.data,
        command.connectionId,
        now,
        Math.max(-1, ...lobby.players.map((candidate) => candidate.joinOrder)) + 1,
        false,
        this.dependencies.playerIdGenerator,
        this.dependencies.sessionTokenGenerator,
      )
      lobby.players.push(player)
      electHost(lobby)
      touchLobby(lobby, now)

      return { lobby, result: toEntryResponse(lobby, player) }
    })
  }

  resume(command: ResumeSessionCommand): Promise<ResumeResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<ResumeResult>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyOpen(lobby)

      const player = findSessionPlayer(lobby, command.sessionToken)
      if (lobby.players.some(
        (candidate) => candidate.id !== player.id
          && candidate.connected
          && candidate.connectionId === command.connectionId,
      )) {
        throw new LobbyError(
          ERROR_CODE.INVALID_PAYLOAD,
          'Cette connexion possède déjà une session active.',
        )
      }
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

      const hostBeforeResume = lobby.players.find((candidate) => candidate.isHost)
      if (!hostBeforeResume) electHost(lobby)
      const hostChanged = !hostBeforeResume && player.isHost

      if (publicStateChanged || hostChanged) touchLobby(lobby, now)

      return {
        lobby,
        result: {
          response: toEntryResponse(lobby, player),
          replacedConnectionId,
          publicStateChanged: publicStateChanged || hostChanged,
        },
      }
    })
  }

  keepAlive(command: SessionCommand): Promise<void> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<void>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyOpen(lobby)
      const player = authenticateConnectedSession(lobby, command)
      player.lastSeenAt = this.dependencies.clock.now()
      return { lobby, result: undefined }
    })
  }

  disconnect(connectionId: ConnectionId): Promise<DisconnectResult> {
    assertConnectionId(connectionId)
    return this.dependencies.repository.mutate<DisconnectResult>((lobby) => {
      if (!lobby) {
        return {
          lobby: null,
          result: { lobby: null, playerId: null, changed: false },
        }
      }

      const player = lobby.players.find(
        (candidate) => candidate.connectionId === connectionId,
      )
      if (!player) {
        return {
          lobby,
          result: {
            lobby: toLobbySnapshot(lobby),
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
      touchLobby(lobby, now)

      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          playerId: player.id,
          changed: true,
        },
      }
    })
  }

  leave(command: SessionCommand): Promise<LobbyChangeResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbyChangeResult>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }

      const player = authenticateConnectedSession(lobby, command)
      const connectionId = player.connectionId
      const now = this.dependencies.clock.now()

      if (lobby.phase === LOBBY_PHASE.STARTED) {
        player.connectionId = null
        player.connected = false
        player.lastSeenAt = now
        player.disconnectedAt = now
        player.sessionRevoked = true

        if (player.isHost) {
          closeLobby(lobby, now, LOBBY_CLOSED_REASON.HOST_LEFT)
        } else {
          if (lobby.game) {
            const grantIndex = lobby.game.roleAccessGrants.findIndex(
              (grant) => grant.playerId === player.id,
            )
            if (grantIndex >= 0) {
              lobby.game.roleAccessGrants.splice(grantIndex, 1)
            }
          }
          touchLobby(lobby, now)
        }

        return {
          lobby,
          result: {
            lobby: toLobbySnapshot(lobby),
            playerId: player.id,
            connectionId,
            lobbyClosedReason: lobby.closeReason,
          },
        }
      }

      lobby.players = lobby.players.filter((candidate) => candidate.id !== player.id)
      if (lobby.players.length === 0) {
        return {
          lobby: null,
          result: {
            lobby: null,
            playerId: player.id,
            connectionId,
            lobbyClosedReason: null,
          },
        }
      }

      if (player.isHost) electHost(lobby)
      touchLobby(lobby, now)
      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          playerId: player.id,
          connectionId,
          lobbyClosedReason: null,
        },
      }
    })
  }

  kick(command: SessionCommand, targetPlayerId: string): Promise<LobbyChangeResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbyChangeResult>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyPhase(lobby)

      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      const target = lobby.players.find((player) => player.id === targetPlayerId)
      if (!target) {
        throw new LobbyError(ERROR_CODE.PLAYER_NOT_FOUND, 'Joueur introuvable.')
      }
      if (target.isHost) {
        throw new LobbyError(
          ERROR_CODE.NOT_GAME_MASTER,
          'Le maître du jeu ne peut pas être expulsé.',
        )
      }

      lobby.players = lobby.players.filter((player) => player.id !== target.id)
      touchLobby(lobby, this.dependencies.clock.now())
      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          playerId: target.id,
          connectionId: target.connectionId,
          lobbyClosedReason: null,
        },
      }
    })
  }

  start(command: SessionCommand): Promise<StartGameResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<StartGameResult>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyPhase(lobby)

      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      if (lobby.players.some((player) => !player.connected)) {
        throw new LobbyError(
          ERROR_CODE.PLAYERS_DISCONNECTED,
          'Tous les joueurs doivent être connectés.',
        )
      }
      if (!canStartLobby(lobby)) {
        throw new LobbyError(
          ERROR_CODE.NOT_ENOUGH_PLAYERS,
          `Au moins ${PLAYER_COUNT.MINIMUM} joueurs sont nécessaires.`,
        )
      }

      const startedAt = this.dependencies.clock.now()
      lobby.game = createStoredGameState(
        lobby,
        this.dependencies.assignmentGenerator,
        this.dependencies.roleAccessTokenGenerator,
        startedAt,
      )
      lobby.phase = LOBBY_PHASE.STARTED
      touchLobby(lobby, startedAt)

      const privateAssignments = lobby.players
        .filter((player) => !player.isHost)
        .map((player) => {
          if (!player.connectionId) {
            throw new Error(`Started player has no connection: ${player.id}`)
          }
          return {
            connectionId: player.connectionId,
            assignment: toPrivateAssignment(lobby, player.id),
          }
        })
      if (!host.connectionId) {
        throw new Error('Started host has no connection')
      }

      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          startedAt,
          privateAssignments,
          hostDashboard: {
            connectionId: host.connectionId,
            dashboard: toHostDashboard(lobby),
          },
        },
      }
    })
  }

  async getPrivateAssignment(command: SessionCommand): Promise<PrivateAssignment> {
    assertConnectionId(command.connectionId)
    const lobby = await this.dependencies.repository.read()
    if (!lobby) {
      throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
    }
    assertStartedGame(lobby)
    const player = authenticateConnectedSession(lobby, command)
    if (player.isHost) {
      throw new LobbyError(
        ERROR_CODE.PLAYER_NOT_FOUND,
        'Le maître du jeu ne possède pas de rôle joueur.',
      )
    }
    return toPrivateAssignment(lobby, player.id)
  }

  async getHostDashboard(command: SessionCommand): Promise<HostDashboard> {
    assertConnectionId(command.connectionId)
    const lobby = await this.dependencies.repository.read()
    if (!lobby) {
      throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
    }
    assertStartedGame(lobby)
    const player = authenticateConnectedSession(lobby, command)
    assertHost(player)
    return toHostDashboard(lobby)
  }

  async accessRole(roleAccessToken: string): Promise<RoleAccessResponse> {
    const parsedToken = roleAccessTokenSchema.safeParse(roleAccessToken)
    if (!parsedToken.success) {
      throw new LobbyError(
        ERROR_CODE.INVALID_ROLE_TOKEN,
        'Le lien de rôle est invalide.',
      )
    }

    const lobby = await this.dependencies.repository.read()
    if (!lobby || lobby.phase === LOBBY_PHASE.CLOSED) {
      throw new LobbyError(
        ERROR_CODE.INVALID_ROLE_TOKEN,
        'Le lien de rôle est invalide.',
      )
    }
    if (lobby.phase !== LOBBY_PHASE.STARTED || !lobby.game) {
      throw new LobbyError(
        ERROR_CODE.INVALID_ROLE_TOKEN,
        'Le lien de rôle est invalide.',
      )
    }

    const grant = lobby.game.roleAccessGrants.find(
      (candidate) => candidate.token === parsedToken.data,
    )
    if (!grant) {
      throw new LobbyError(
        ERROR_CODE.INVALID_ROLE_TOKEN,
        'Le lien de rôle est invalide.',
      )
    }

    return toRoleAccessResponse(lobby, grant)
  }

  cleanup(): Promise<CleanupResult> {
    return this.dependencies.repository.mutate<CleanupResult>((lobby) => {
      if (!lobby) {
        return {
          lobby: null,
          result: {
            lobby: null,
            removedPlayerIds: [],
            lobbyExpired: false,
            lobbyPurged: false,
          },
        }
      }

      const now = this.dependencies.clock.now()
      if (
        lobby.phase === LOBBY_PHASE.CLOSED
        && lobby.closedAt !== null
        && now - lobby.closedAt >= LOBBY_TIME_LIMIT.CLOSED_LOBBY_RETENTION_MS
      ) {
        return {
          lobby: null,
          result: {
            lobby: null,
            removedPlayerIds: [],
            lobbyExpired: false,
            lobbyPurged: true,
          },
        }
      }

      if (
        lobby.phase !== LOBBY_PHASE.CLOSED
        && now - lobby.createdAt >= LOBBY_TIME_LIMIT.LOBBY_MAX_AGE_MS
      ) {
        closeLobby(lobby, now, LOBBY_CLOSED_REASON.EXPIRED)
        return {
          lobby,
          result: {
            lobby: toLobbySnapshot(lobby),
            removedPlayerIds: [],
            lobbyExpired: true,
            lobbyPurged: false,
          },
        }
      }

      if (lobby.phase !== LOBBY_PHASE.LOBBY) {
        return {
          lobby,
          result: {
            lobby: toLobbySnapshot(lobby),
            removedPlayerIds: [],
            lobbyExpired: false,
            lobbyPurged: false,
          },
        }
      }

      const removedPlayers = lobby.players.filter(
        (player) => !player.connected
          && player.disconnectedAt !== null
          && now - player.disconnectedAt
            >= LOBBY_TIME_LIMIT.DISCONNECTED_SESSION_GRACE_MS,
      )
      if (removedPlayers.length === 0) {
        return {
          lobby,
          result: {
            lobby: toLobbySnapshot(lobby),
            removedPlayerIds: [],
            lobbyExpired: false,
            lobbyPurged: false,
          },
        }
      }

      const removedPlayerIds = removedPlayers.map((player) => player.id)
      lobby.players = lobby.players.filter(
        (player) => !removedPlayerIds.includes(player.id),
      )
      if (lobby.players.length === 0) {
        return {
          lobby: null,
          result: {
            lobby: null,
            removedPlayerIds,
            lobbyExpired: false,
            lobbyPurged: false,
          },
        }
      }

      const hasHost = lobby.players.some((player) => player.isHost)
      if (!hasHost) electHost(lobby)
      touchLobby(lobby, now)

      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          removedPlayerIds,
          lobbyExpired: false,
          lobbyPurged: false,
        },
      }
    })
  }
}
