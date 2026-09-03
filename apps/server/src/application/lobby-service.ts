import {
  ERROR_CODE,
  DAY_VOTE_CHOICE,
  DAY_VOTE_STATUS,
  GAME_LOG_EVENT_TYPE,
  GAME_PHASE_PERIOD,
  LOBBY_CLOSED_REASON,
  LOBBY_ID,
  LOBBY_PHASE,
  createInitialGamePhase,
  getNextGamePhase,
  getPreviousGamePhase,
  playerIdSchema,
  playerNameSchema,
  roleAccessTokenSchema,
  sessionTokenSchema,
  type GameLogEntry,
  type GameLogEventType,
  type DayNomination,
  type DayVoteBallot,
  type DayVotePrivateStatus,
  type GameStartPreview,
  type EmptyResponse,
  type HostDashboard,
  type PlayerId,
  type PrivateAssignment,
  type RoleAccessResponse,
  type LobbyEntryResponse,
  type LobbySnapshot,
  type SessionResumeResponse,
} from '@lgu/contracts'
import { PLAYER_COUNT, ROLE_ID } from '@lgu/game-core'

import { LOBBY_TIME_LIMIT } from '../config/lobby-constants'
import { LobbyError } from '../domain/lobby-error'
import { assertDayPhase, assertDayVotingEnabled, getLivingRegularPlayers, resetDayVoting, resolveDayVote, synchronizeGameTerminalState } from '../domain/day-voting'
import type {
  Clock,
  AdvanceGamePhaseCommand,
  ConnectionId,
  DeleteGameLogEventCommand,
  EditGameLogEventCommand,
  EnterLobbyCommand,
  GameAssignmentGenerator,
  RecordGameLogEventCommand,
  LobbyPlayerState,
  LobbyState,
  DayNominationDecisionServerCommand,
  DayNominationProposeServerCommand,
  DayVoteSubmitServerCommand,
  DayVotingEnabledServerCommand,
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
import { createGameAssignment, createStoredGameState } from './game-state'
import {
  toHostDashboard,
  toGameStartPreview,
  toLoupBlancDashboard,
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
  readonly loupBlancDashboards: readonly HostDashboardDelivery[]
  readonly hostDashboard: HostDashboardDelivery
}

export interface StartPreviewResult {
  readonly lobby: LobbySnapshot
  readonly preview: GameStartPreview
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

function assertGameInProgress(lobby: LobbyState): void {
  assertStartedGame(lobby)
  if (lobby.game?.gameEnded) {
    throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'La partie est terminée.')
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

function assertExpectedRevision(lobby: LobbyState, expectedRevision: number): void {
  if (expectedRevision !== lobby.revision) {
    throw new LobbyError(
      ERROR_CODE.STALE_REVISION,
      'La partie a changé. Actualisez les informations avant de réessayer.',
    )
  }
}

function eventTypeMatchesPhase(
  eventType: GameLogEventType,
  period: (typeof GAME_PHASE_PERIOD)[keyof typeof GAME_PHASE_PERIOD],
): boolean {
  if (eventType === GAME_LOG_EVENT_TYPE.DAY_VOTE) return period === GAME_PHASE_PERIOD.DAY
  return eventType === GAME_LOG_EVENT_TYPE.NIGHT_KILL
    ? period === GAME_PHASE_PERIOD.NIGHT
    : period === GAME_PHASE_PERIOD.DAY
}

function validateGameLog(
  lobby: LobbyState,
  entries: readonly GameLogEntry[],
): Set<string> {
  const assignedPlayerIds = new Set(
    lobby.game?.assignment.assignments.map((assignment) => assignment.playerId) ?? [],
  )
  const deadPlayerIds = new Set<string>()

  for (const entry of entries) {
    if (!eventTypeMatchesPhase(entry.eventType, entry.phase.period)) {
      throw new LobbyError(
        ERROR_CODE.INVALID_GAME_EVENT,
        'Le type d’événement ne correspond pas à sa phase.',
      )
    }
    if (!assignedPlayerIds.has(entry.targetPlayerId)) {
      throw new LobbyError(
        ERROR_CODE.INVALID_GAME_EVENT,
        'Seul un joueur de la partie peut apparaître dans le journal.',
      )
    }
    if (entry.eventType === GAME_LOG_EVENT_TYPE.DAY_VOTE) continue
    if (deadPlayerIds.has(entry.targetPlayerId)) {
      throw new LobbyError(
        ERROR_CODE.INVALID_GAME_EVENT,
        'Un joueur ne peut mourir qu’une seule fois.',
      )
    }
    deadPlayerIds.add(entry.targetPlayerId)
  }

  return deadPlayerIds
}

function findGameTarget(
  lobby: LobbyState,
  targetPlayerId: PlayerId,
): LobbyPlayerState {
  const target = lobby.players.find((player) => player.id === targetPlayerId)
  if (!target || target.isHost) {
    throw new LobbyError(
      ERROR_CODE.INVALID_GAME_EVENT,
      'Le maître du jeu ne peut pas être enregistré comme victime.',
    )
  }
  const isAssigned = lobby.game?.assignment.assignments.some(
    (assignment) => assignment.playerId === target.id,
  )
  if (!isAssigned) {
    throw new LobbyError(
      ERROR_CODE.INVALID_GAME_EVENT,
      'La cible ne participe pas à cette partie.',
    )
  }
  return target
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
          gamePhase: null,
          dayVotingEnabled: false,
          gameStartPreview: null,
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
      lobby.gameStartPreview = null
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

      lobby.gameStartPreview = null
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

      lobby.gameStartPreview = null
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

  prepareStartPreview(command: SessionCommand): Promise<StartPreviewResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<StartPreviewResult>((lobby) => {
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

      const preparedAt = this.dependencies.clock.now()
      const previewState = {
        assignment: createGameAssignment(lobby, this.dependencies.assignmentGenerator),
        preparedAt,
      }
      lobby.gameStartPreview = previewState
      touchLobby(lobby, preparedAt)

      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          preview: toGameStartPreview(lobby, previewState.assignment),
        },
      }
    })
  }

  redistributeStartPreview(command: SessionCommand): Promise<StartPreviewResult> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<StartPreviewResult>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyPhase(lobby)

      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      if (!lobby.gameStartPreview) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Aucun aperçu de partie n’est en cours.')
      }
      if (lobby.players.some((player) => !player.connected)) {
        throw new LobbyError(ERROR_CODE.PLAYERS_DISCONNECTED, 'Tous les joueurs doivent être connectés.')
      }
      if (!canStartLobby(lobby)) {
        throw new LobbyError(ERROR_CODE.NOT_ENOUGH_PLAYERS, `Au moins ${PLAYER_COUNT.MINIMUM} joueurs sont nécessaires.`)
      }

      const preparedAt = this.dependencies.clock.now()
      const previewState = {
        assignment: createGameAssignment(lobby, this.dependencies.assignmentGenerator),
        preparedAt,
      }
      lobby.gameStartPreview = previewState
      touchLobby(lobby, preparedAt)
      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          preview: toGameStartPreview(lobby, previewState.assignment),
        },
      }
    })
  }

  cancelStartPreview(command: SessionCommand): Promise<EmptyResponse> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<EmptyResponse>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertLobbyPhase(lobby)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      lobby.gameStartPreview = null
      touchLobby(lobby, this.dependencies.clock.now())
      return { lobby, result: {} }
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
        throw new LobbyError(ERROR_CODE.PLAYERS_DISCONNECTED, 'Tous les joueurs doivent être connectés.')
      }
      if (!canStartLobby(lobby)) {
        throw new LobbyError(ERROR_CODE.NOT_ENOUGH_PLAYERS, `Au moins ${PLAYER_COUNT.MINIMUM} joueurs sont nécessaires.`)
      }

      const startedAt = this.dependencies.clock.now()
      lobby.game = createStoredGameState(
        lobby,
        this.dependencies.assignmentGenerator,
        this.dependencies.roleAccessTokenGenerator,
        startedAt,
        lobby.gameStartPreview?.assignment
          ?? createGameAssignment(lobby, this.dependencies.assignmentGenerator),
      )
      lobby.gameStartPreview = null
      lobby.phase = LOBBY_PHASE.STARTED
      lobby.gamePhase = createInitialGamePhase()
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

      const loupBlancDashboards = lobby.players
        .filter((player) => !player.isHost)
        .flatMap((player): HostDashboardDelivery[] => {
          const assignment = lobby.game?.assignment.assignments.find(
            (candidate) => candidate.playerId === player.id,
          )
          if (assignment?.roleId !== ROLE_ID.LOUP_BLANC) return []
          if (!player.connectionId) {
            throw new Error(`Loup Blanc has no connection: ${player.id}`)
          }
          return [{
            connectionId: player.connectionId,
            dashboard: toLoupBlancDashboard(lobby, player.id),
          }]
        })

      return {
        lobby,
        result: {
          lobby: toLobbySnapshot(lobby),
          startedAt,
          privateAssignments,
          loupBlancDashboards,
          hostDashboard: {
            connectionId: host.connectionId,
            dashboard: toHostDashboard(lobby),
          },
        },
      }
    })
  }

  confirmStart(command: SessionCommand): Promise<StartGameResult> {
    return this.start(command)
  }

  setDayVotingEnabled(command: DayVotingEnabledServerCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      assertLobbyPhase(lobby)
      assertExpectedRevision(lobby, command.expectedRevision)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      lobby.dayVotingEnabled = command.enabled
      touchLobby(lobby, this.dependencies.clock.now())
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  proposeDayNomination(command: DayNominationProposeServerCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      assertGameInProgress(lobby)
      assertExpectedRevision(lobby, command.expectedRevision)
      assertDayPhase(lobby)
      assertDayVotingEnabled(lobby)
      const player = authenticateConnectedSession(lobby, command)
      if (player.isHost) throw new LobbyError(ERROR_CODE.NOT_GAME_MASTER, 'Le maître du jeu ne peut pas nominer.')
      const game = lobby.game!
      if (game.dayVoting.status === DAY_VOTE_STATUS.NOMINATION_PENDING || game.dayVoting.status === DAY_VOTE_STATUS.NOMINATION_VALIDATED || game.dayVoting.status === DAY_VOTE_STATUS.ACTIVE) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Une nomination est déjà en cours.')
      }
      const livingPlayers = getLivingRegularPlayers(lobby)
      if (!livingPlayers.some((candidate) => candidate.id === player.id)) {
        throw new LobbyError(ERROR_CODE.PLAYER_ALREADY_DEAD, 'Les fantômes ne peuvent pas nominer.')
      }
      if (game.dayVoting.nominatedByIds.includes(player.id)) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Vous avez déjà nominé quelqu’un aujourd’hui.')
      }
      const target = livingPlayers.find((candidate) => candidate.id === command.targetPlayerId)
      if (!target || target.id === player.id || game.dayVoting.nominatedTargetIds.includes(target.id)) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Cette cible ne peut pas être nominée.')
      }
      const createdAt = this.dependencies.clock.now()
      const nomination: DayNomination = {
        id: `nomination-${lobby.revision + 1}`,
        day: lobby.gamePhase!.number,
        nominatorId: player.id,
        nominatorName: player.name,
        targetId: target.id,
        targetName: target.name,
        createdAt,
      }
      game.dayVoting = { ...game.dayVoting, status: DAY_VOTE_STATUS.NOMINATION_PENDING, nomination, result: null }
      touchLobby(lobby, createdAt)
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  approveDayNomination(command: DayNominationDecisionServerCommand): Promise<LobbySnapshot> {
    return this.decideDayNomination(command, true)
  }

  rejectDayNomination(command: DayNominationDecisionServerCommand): Promise<LobbySnapshot> {
    return this.decideDayNomination(command, false)
  }

  private decideDayNomination(command: DayNominationDecisionServerCommand, approve: boolean): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      assertGameInProgress(lobby)
      assertExpectedRevision(lobby, command.expectedRevision)
      assertDayPhase(lobby)
      assertDayVotingEnabled(lobby)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      const game = lobby.game!
      const nomination = game.dayVoting.nomination
      if (game.dayVoting.status !== DAY_VOTE_STATUS.NOMINATION_PENDING || !nomination || nomination.id !== command.nominationId) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Cette nomination n’est plus disponible.')
      }
      const now = this.dependencies.clock.now()
      if (!approve) {
        game.dayVoting = { ...game.dayVoting, status: DAY_VOTE_STATUS.IDLE, nomination: null, result: null }
      } else {
        game.dayVoting = {
          ...game.dayVoting,
          status: DAY_VOTE_STATUS.NOMINATION_VALIDATED,
          nominatedByIds: [...game.dayVoting.nominatedByIds, nomination.nominatorId],
          nominatedTargetIds: [...game.dayVoting.nominatedTargetIds, nomination.targetId],
          result: null,
        }
      }
      touchLobby(lobby, now)
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  startDayVote(command: DayNominationDecisionServerCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      assertGameInProgress(lobby)
      assertExpectedRevision(lobby, command.expectedRevision)
      assertDayPhase(lobby)
      assertDayVotingEnabled(lobby)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      const game = lobby.game!
      const nomination = game.dayVoting.nomination
      if (game.dayVoting.status !== DAY_VOTE_STATUS.NOMINATION_VALIDATED || !nomination || nomination.id !== command.nominationId) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Cette nomination n’est pas prête à être soumise au vote.')
      }
      const livingPlayers = getLivingRegularPlayers(lobby)
      const ghosts = lobby.players.filter((player) => !player.isHost && !livingPlayers.some((living) => living.id === player.id))
      const now = this.dependencies.clock.now()
      game.dayVoting = {
        ...game.dayVoting,
        status: DAY_VOTE_STATUS.ACTIVE,
        eligibleVoterIds: [
          ...livingPlayers.map((player) => player.id),
          ...ghosts.filter((player) => !game.ghostFinalVoteUsedIds.includes(player.id)).map((player) => player.id),
        ],
        ballots: [],
        livingPlayerCount: livingPlayers.length,
        yesCount: 0,
        noCount: 0,
        threshold: Math.floor(livingPlayers.length / 2) + 1,
        closesAt: now + 15_000,
        result: null,
      }
      touchLobby(lobby, now)
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  submitDayVote(command: DayVoteSubmitServerCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      assertGameInProgress(lobby)
      assertExpectedRevision(lobby, command.expectedRevision)
      assertDayPhase(lobby)
      assertDayVotingEnabled(lobby)
      const player = authenticateConnectedSession(lobby, command)
      const game = lobby.game!
      if (game.dayVoting.status !== DAY_VOTE_STATUS.ACTIVE || !game.dayVoting.nomination) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Aucun vote n’est ouvert.')
      }
      const now = this.dependencies.clock.now()
      if (game.dayVoting.closesAt !== null && now >= game.dayVoting.closesAt) {
        resolveDayVote(lobby, now)
        touchLobby(lobby, now)
        return { lobby, result: toLobbySnapshot(lobby) }
      }
      if (!game.dayVoting.eligibleVoterIds.includes(player.id) || game.dayVoting.ballots.some((ballot) => ballot.voterId === player.id)) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Vous ne pouvez pas voter à nouveau.')
      }
      game.dayVoting.ballots.push({ voterId: player.id, voterName: player.name, choice: command.choice } satisfies DayVoteBallot)
      if (command.choice === DAY_VOTE_CHOICE.YES && !getLivingRegularPlayers(lobby).some((candidate) => candidate.id === player.id)) {
        game.ghostFinalVoteUsedIds.push(player.id)
      }
      game.dayVoting.yesCount = game.dayVoting.ballots.filter((ballot) => ballot.choice === DAY_VOTE_CHOICE.YES).length
      game.dayVoting.noCount = game.dayVoting.ballots.length - game.dayVoting.yesCount
      if (game.dayVoting.ballots.length >= game.dayVoting.eligibleVoterIds.length) resolveDayVote(lobby, now)
      touchLobby(lobby, now)
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  async getDayVotePrivateStatus(command: SessionCommand): Promise<DayVotePrivateStatus> {
    assertConnectionId(command.connectionId)
    const lobby = await this.dependencies.repository.read()
    if (!lobby) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
    assertStartedGame(lobby)
    const player = authenticateConnectedSession(lobby, command)
    const dayVote = lobby.game!.dayVoting
    const ballot = dayVote.ballots.find((candidate) => candidate.voterId === player.id)
    return {
      day: dayVote.day,
      nominationId: dayVote.nomination?.id ?? null,
      choice: ballot?.choice ?? null,
    }
  }

  expireDayVote(lobbyId: string): Promise<LobbySnapshot | null> {
    return this.dependencies.repository.mutate<LobbySnapshot | null>((lobby) => {
      if (!lobby || lobby.id !== lobbyId || !lobby.game || lobby.gamePhase?.period !== GAME_PHASE_PERIOD.DAY) {
        return { lobby, result: lobby ? toLobbySnapshot(lobby) : null }
      }
      const now = this.dependencies.clock.now()
      if (lobby.game.dayVoting.status !== DAY_VOTE_STATUS.ACTIVE || lobby.game.dayVoting.closesAt === null || now < lobby.game.dayVoting.closesAt) {
        return { lobby, result: toLobbySnapshot(lobby) }
      }
      resolveDayVote(lobby, now)
      touchLobby(lobby, now)
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  advanceGamePhase(command: AdvanceGamePhaseCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertGameInProgress(lobby)

      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      if (!lobby.gamePhase) {
        throw new LobbyError(
          ERROR_CODE.GAME_NOT_STARTED,
          'La phase de jeu n’est pas initialisée.',
        )
      }
      if (command.expectedRevision !== lobby.revision) {
        throw new LobbyError(
          ERROR_CODE.STALE_REVISION,
          'La partie a changé. Actualisez la phase avant de réessayer.',
        )
      }

      const now = this.dependencies.clock.now()
      if (lobby.gamePhase.period === GAME_PHASE_PERIOD.DAY && lobby.game.dayVoting.status === DAY_VOTE_STATUS.ACTIVE) {
        resolveDayVote(lobby, now)
      }
      lobby.gamePhase = getNextGamePhase(lobby.gamePhase)
      resetDayVoting(lobby, lobby.gamePhase.number)
      touchLobby(lobby, now)
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  rewindGamePhase(command: AdvanceGamePhaseCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertGameInProgress(lobby)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      assertExpectedRevision(lobby, command.expectedRevision)
      if (!lobby.gamePhase) {
        throw new LobbyError(ERROR_CODE.GAME_NOT_STARTED, 'La phase de jeu n’est pas initialisée.')
      }
      const previousPhase = getPreviousGamePhase(lobby.gamePhase)
      if (!previousPhase) {
        throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'La partie est déjà à la première nuit.')
      }
      lobby.gamePhase = previousPhase
      resetDayVoting(lobby, previousPhase.number)
      touchLobby(lobby, this.dependencies.clock.now())
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  recordGameLogEvent(command: RecordGameLogEventCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertGameInProgress(lobby)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      assertExpectedRevision(lobby, command.expectedRevision)
      const currentPhase = lobby.gamePhase
      if (!currentPhase || !eventTypeMatchesPhase(command.eventType, currentPhase.period)) {
        throw new LobbyError(
          ERROR_CODE.INVALID_GAME_EVENT,
          'Cet événement ne correspond pas à la phase actuelle.',
        )
      }

      const game = lobby.game!
      const target = findGameTarget(lobby, command.targetPlayerId)
      const currentEntries = game.gameLog
      const deadPlayerIds = validateGameLog(lobby, currentEntries)
      if (deadPlayerIds.has(target.id)) {
        throw new LobbyError(
          ERROR_CODE.PLAYER_ALREADY_DEAD,
          'Ce joueur est déjà un fantôme.',
        )
      }

      const entry: GameLogEntry = {
        id: `game-event-${lobby.revision + 1}`,
        eventType: command.eventType,
        phase: currentPhase,
        targetPlayerId: target.id,
        targetPlayerName: target.name,
      }
      game.gameLog = [...currentEntries, entry]
      validateGameLog(lobby, game.gameLog)
      synchronizeGameTerminalState(lobby)
      touchLobby(lobby, this.dependencies.clock.now())
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  editGameLogEvent(command: EditGameLogEventCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertStartedGame(lobby)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      assertExpectedRevision(lobby, command.expectedRevision)

      const game = lobby.game!
      const eventIndex = game.gameLog.findIndex((entry) => entry.id === command.eventId)
      if (eventIndex < 0) {
        throw new LobbyError(
          ERROR_CODE.GAME_EVENT_NOT_FOUND,
          'Événement introuvable dans le journal.',
        )
      }
      const target = findGameTarget(lobby, command.targetPlayerId)
      const currentEntry = game.gameLog[eventIndex]
      if (!currentEntry) {
        throw new LobbyError(
          ERROR_CODE.GAME_EVENT_NOT_FOUND,
          'Événement introuvable dans le journal.',
        )
      }
      if (currentEntry.targetPlayerId === target.id) {
        return { lobby, result: toLobbySnapshot(lobby) }
      }

      const editedEntries = game.gameLog.map((entry, index) => (
        index === eventIndex
          ? { ...entry, targetPlayerId: target.id, targetPlayerName: target.name }
          : entry
      ))
      validateGameLog(lobby, editedEntries)
      game.gameLog = editedEntries
      synchronizeGameTerminalState(lobby)
      touchLobby(lobby, this.dependencies.clock.now())
      return { lobby, result: toLobbySnapshot(lobby) }
    })
  }

  deleteGameLogEvent(command: DeleteGameLogEventCommand): Promise<LobbySnapshot> {
    assertConnectionId(command.connectionId)
    return this.dependencies.repository.mutate<LobbySnapshot>((lobby) => {
      if (!lobby) {
        throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
      }
      assertStartedGame(lobby)
      const host = authenticateConnectedSession(lobby, command)
      assertHost(host)
      assertExpectedRevision(lobby, command.expectedRevision)

      const game = lobby.game!
      const eventIndex = game.gameLog.findIndex((entry) => entry.id === command.eventId)
      if (eventIndex < 0) {
        throw new LobbyError(
          ERROR_CODE.GAME_EVENT_NOT_FOUND,
          'Événement introuvable dans le journal.',
        )
      }

      const remainingEntries = game.gameLog.filter((_, index) => index !== eventIndex)
      validateGameLog(lobby, remainingEntries)
      game.gameLog = remainingEntries
      synchronizeGameTerminalState(lobby)
      touchLobby(lobby, this.dependencies.clock.now())
      return { lobby, result: toLobbySnapshot(lobby) }
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

  async getLoupBlancDashboard(command: SessionCommand): Promise<HostDashboard> {
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
        'Le maître du jeu ne possède pas ce rôle joueur.',
      )
    }
    return toLoupBlancDashboard(lobby, player.id)
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

  async getStartPreview(command: SessionCommand): Promise<GameStartPreview | null> {
    assertConnectionId(command.connectionId)
    const lobby = await this.dependencies.repository.read()
    if (!lobby) {
      throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
    }
    assertLobbyOpen(lobby)
    const player = authenticateConnectedSession(lobby, command)
    assertHost(player)
    if (lobby.phase !== LOBBY_PHASE.LOBBY || !lobby.gameStartPreview) return null
    return toGameStartPreview(lobby, lobby.gameStartPreview.assignment)
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
      lobby.gameStartPreview = null
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
