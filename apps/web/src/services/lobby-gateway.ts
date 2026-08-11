import type { ZodType } from 'zod'

import {
  SOCKET_EVENT,
  LOBBY_ID,
  createAckSchema,
  emptyResponseSchema,
  gameLogDeleteCommandSchema,
  gameLogEditCommandSchema,
  gameLogRecordCommandSchema,
  gamePhaseAdvanceCommandSchema,
  gameStartedEventSchema,
  hostDashboardSchema,
  notificationEventSchema,
  privateAssignmentSchema,
  lobbyClosedEventSchema,
  lobbyEntryResponseSchema,
  lobbyListResponseSchema,
  lobbySnapshotSchema,
  sessionEndedEventSchema,
  sessionResumeResponseSchema,
  systemReadyEventSchema,
  type Ack,
  type ClientRequestId,
  type EmptyResponse,
  type GameLogEventType,
  type GameStartedEvent,
  type HostDashboard,
  type NotificationEvent,
  type PlayerId,
  type PrivateAssignment,
  type LobbyClosedEvent,
  type LobbyEntryResponse,
  type LobbyListResponse,
  type LobbySnapshot,
  type SessionEndedEvent,
  type SessionResumeResponse,
  type SessionToken,
  type SystemReadyEvent,
} from '@lgu/contracts'

import {
  CLIENT_TIMING,
  CONNECTION_STATE,
  type ConnectionState,
} from '../constants/app'
import { getSocket, type GameSocket } from './socket'

const ENTER_RECOVERY_WINDOW_MS = 5 * 60 * 1_000

const lobbyEntryAckSchema = createAckSchema(lobbyEntryResponseSchema)
const sessionResumeAckSchema = createAckSchema(sessionResumeResponseSchema)
const lobbySnapshotAckSchema = createAckSchema(lobbySnapshotSchema)
const emptyAckSchema = createAckSchema(emptyResponseSchema)
const gamePhaseAdvanceAckSchema = createAckSchema(lobbySnapshotSchema)
const gameLogAckSchema = createAckSchema(lobbySnapshotSchema)

export interface LobbyGatewayHandlers {
  readonly onConnectionState: (state: ConnectionState) => void
  readonly onSystemReady: (event: SystemReadyEvent) => void
  readonly onLobbySnapshot: (snapshot: LobbySnapshot) => void
  readonly onGameStarted: (event: GameStartedEvent) => void
  readonly onPrivateAssignment: (assignment: PrivateAssignment) => void
  readonly onHostDashboard: (dashboard: HostDashboard) => void
  readonly onLobbyClosed: (event: LobbyClosedEvent) => void
  readonly onSessionEnded: (event: SessionEndedEvent) => void
  readonly onNotification: (event: NotificationEvent) => void
  readonly onProtocolError: () => void
}

export interface LobbyGateway {
  connect(): Promise<void>
  reconnect(): Promise<void>
  disconnect(): void
  subscribe(handlers: LobbyGatewayHandlers): () => void
  enter(playerName: string): Promise<Ack<LobbyEntryResponse>>
  listLobbies(): Promise<Ack<LobbyListResponse>>
  createLobby(playerName: string): Promise<Ack<LobbyEntryResponse>>
  joinLobby(lobbyId: string, playerName: string): Promise<Ack<LobbyEntryResponse>>
  resume(sessionToken: SessionToken, lobbyId?: string): Promise<Ack<SessionResumeResponse>>
  leave(): Promise<Ack<EmptyResponse>>
  kick(playerId: PlayerId): Promise<Ack<LobbySnapshot>>
  start(): Promise<Ack<EmptyResponse>>
  advanceGamePhase(expectedRevision: number): Promise<Ack<LobbySnapshot>>
  recordGameLogEvent(eventType: GameLogEventType, targetPlayerId: string, expectedRevision: number): Promise<Ack<LobbySnapshot>>
  editGameLogEvent(eventId: string, targetPlayerId: string, expectedRevision: number): Promise<Ack<LobbySnapshot>>
  deleteGameLogEvent(eventId: string, expectedRevision: number): Promise<Ack<LobbySnapshot>>
  keepAlive(): Promise<Ack<EmptyResponse>>
}

export class GatewayTimeoutError extends Error {
  constructor(operation: string) {
    super(`Timeout while waiting for ${operation}`)
    this.name = 'GatewayTimeoutError'
  }
}

function deliverEvent<T>(
  schema: ZodType<T>,
  value: unknown,
  deliver: (event: T) => void,
  onProtocolError: () => void,
): void {
  const parsed = schema.safeParse(value)
  if (parsed.success) deliver(parsed.data)
  else onProtocolError()
}

export class SocketLobbyGateway implements LobbyGateway {
  private pendingEnter: {
    readonly requestId: ClientRequestId
    readonly playerName: string
    readonly expiresAt: number
  } | null = null

  constructor(private readonly socket: GameSocket) {}

  connect(): Promise<void> {
    if (this.socket.connected) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(new GatewayTimeoutError('socket connection'))
      }, CLIENT_TIMING.CONNECT_TIMEOUT_MS)
      const handleConnect = () => {
        cleanup()
        resolve()
      }
      const handleError = (error: Error) => {
        cleanup()
        reject(error)
      }
      const cleanup = () => {
        window.clearTimeout(timeout)
        this.socket.off('connect', handleConnect)
        this.socket.off('connect_error', handleError)
      }

      this.socket.on('connect', handleConnect)
      this.socket.on('connect_error', handleError)
      this.socket.connect()
    })
  }

  async reconnect(): Promise<void> {
    this.socket.disconnect()
    await this.connect()
  }

  disconnect(): void {
    this.socket.disconnect()
  }

  subscribe(handlers: LobbyGatewayHandlers): () => void {
    const onConnect = () => handlers.onConnectionState(CONNECTION_STATE.ONLINE)
    const onDisconnect = () => handlers.onConnectionState(CONNECTION_STATE.OFFLINE)
    const onConnectError = () => handlers.onConnectionState(CONNECTION_STATE.ERROR)
    const onReconnectAttempt = () => {
      handlers.onConnectionState(CONNECTION_STATE.RECONNECTING)
    }
    const onSystemReady = (value: unknown) => {
      deliverEvent(systemReadyEventSchema, value, handlers.onSystemReady, handlers.onProtocolError)
    }
    const onLobbySnapshot = (value: unknown) => {
      deliverEvent(lobbySnapshotSchema, value, handlers.onLobbySnapshot, handlers.onProtocolError)
    }
    const onGameStarted = (value: unknown) => {
      deliverEvent(gameStartedEventSchema, value, handlers.onGameStarted, handlers.onProtocolError)
    }
    const onPrivateAssignment = (value: unknown) => {
      deliverEvent(privateAssignmentSchema, value, handlers.onPrivateAssignment, handlers.onProtocolError)
    }
    const onHostDashboard = (value: unknown) => {
      deliverEvent(hostDashboardSchema, value, handlers.onHostDashboard, handlers.onProtocolError)
    }
    const onLobbyClosed = (value: unknown) => {
      deliverEvent(lobbyClosedEventSchema, value, handlers.onLobbyClosed, handlers.onProtocolError)
    }
    const onSessionEnded = (value: unknown) => {
      deliverEvent(sessionEndedEventSchema, value, handlers.onSessionEnded, handlers.onProtocolError)
    }
    const onNotification = (value: unknown) => {
      deliverEvent(notificationEventSchema, value, handlers.onNotification, handlers.onProtocolError)
    }

    this.socket.on('connect', onConnect)
    this.socket.on('disconnect', onDisconnect)
    this.socket.on('connect_error', onConnectError)
    this.socket.io.on('reconnect_attempt', onReconnectAttempt)
    this.socket.on(SOCKET_EVENT.SYSTEM_READY, onSystemReady)
    this.socket.on(SOCKET_EVENT.LOBBY_SNAPSHOT, onLobbySnapshot)
    this.socket.on(SOCKET_EVENT.GAME_STARTED, onGameStarted)
    this.socket.on(SOCKET_EVENT.PRIVATE_ASSIGNMENT, onPrivateAssignment)
    this.socket.on(SOCKET_EVENT.HOST_DASHBOARD, onHostDashboard)
    this.socket.on(SOCKET_EVENT.LOBBY_CLOSED, onLobbyClosed)
    this.socket.on(SOCKET_EVENT.SESSION_ENDED, onSessionEnded)
    this.socket.on(SOCKET_EVENT.NOTIFICATION, onNotification)

    return () => {
      this.socket.off('connect', onConnect)
      this.socket.off('disconnect', onDisconnect)
      this.socket.off('connect_error', onConnectError)
      this.socket.io.off('reconnect_attempt', onReconnectAttempt)
      this.socket.off(SOCKET_EVENT.SYSTEM_READY, onSystemReady)
      this.socket.off(SOCKET_EVENT.LOBBY_SNAPSHOT, onLobbySnapshot)
      this.socket.off(SOCKET_EVENT.GAME_STARTED, onGameStarted)
      this.socket.off(SOCKET_EVENT.PRIVATE_ASSIGNMENT, onPrivateAssignment)
      this.socket.off(SOCKET_EVENT.HOST_DASHBOARD, onHostDashboard)
      this.socket.off(SOCKET_EVENT.LOBBY_CLOSED, onLobbyClosed)
      this.socket.off(SOCKET_EVENT.SESSION_ENDED, onSessionEnded)
      this.socket.off(SOCKET_EVENT.NOTIFICATION, onNotification)
    }
  }

  async enter(playerName: string): Promise<Ack<LobbyEntryResponse>> {
    if (this.pendingEnter && this.pendingEnter.expiresAt <= Date.now()) {
      this.pendingEnter = null
    }
    this.pendingEnter ??= {
      requestId: crypto.randomUUID(),
      playerName,
      expiresAt: Date.now() + ENTER_RECOVERY_WINDOW_MS,
    }
    const command = {
      playerName: this.pendingEnter.playerName,
      clientRequestId: this.pendingEnter.requestId,
    }
    const sendEntry = () => this.send(
      'lobby entry',
      lobbyEntryAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.LOBBY_ENTER,
        command,
        callback,
      ),
    )

    try {
      const response = await sendEntry()
      this.pendingEnter = null
      return response
    } catch (error) {
      if (!(error instanceof GatewayTimeoutError)) throw error
      const response = await sendEntry()
      this.pendingEnter = null
      return response
    }
  }

  listLobbies(): Promise<Ack<LobbyListResponse>> {
    return this.send(
      'lobby list',
      createAckSchema(lobbyListResponseSchema),
      (callback) => this.socket.emit(SOCKET_EVENT.LOBBY_LIST, {}, callback),
    )
  }

  createLobby(playerName: string): Promise<Ack<LobbyEntryResponse>> {
    return this.send(
      'lobby create',
      lobbyEntryAckSchema,
      (callback) => this.socket.emit(SOCKET_EVENT.LOBBY_CREATE, { playerName }, callback),
    )
  }

  joinLobby(lobbyId: string, playerName: string): Promise<Ack<LobbyEntryResponse>> {
    return this.send(
      'lobby join',
      lobbyEntryAckSchema,
      (callback) => this.socket.emit(SOCKET_EVENT.LOBBY_JOIN, { lobbyId, playerName }, callback),
    )
  }

  resume(sessionToken: SessionToken, lobbyId = LOBBY_ID.MAIN): Promise<Ack<SessionResumeResponse>> {
    return this.send(
      'session resume',
      sessionResumeAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.SESSION_RESUME,
        { lobbyId, sessionToken },
        callback,
      ),
    )
  }

  leave(): Promise<Ack<EmptyResponse>> {
    return this.send(
      'leave',
      emptyAckSchema,
      (callback) => this.socket.emit(SOCKET_EVENT.PLAYER_LEAVE, {}, callback),
    )
  }

  kick(playerId: PlayerId): Promise<Ack<LobbySnapshot>> {
    return this.send(
      'kick',
      lobbySnapshotAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.HOST_KICK,
        { playerId },
        callback,
      ),
    )
  }

  start(): Promise<Ack<EmptyResponse>> {
    return this.send(
      'game start',
      emptyAckSchema,
      (callback) => this.socket.emit(SOCKET_EVENT.GAME_START, {}, callback),
    )
  }

  advanceGamePhase(expectedRevision: number): Promise<Ack<LobbySnapshot>> {
    return this.send(
      'advance game phase',
      gamePhaseAdvanceAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.GAME_PHASE_ADVANCE,
        gamePhaseAdvanceCommandSchema.parse({ expectedRevision }),
        callback,
      ),
    )
  }

  recordGameLogEvent(
    eventType: GameLogEventType,
    targetPlayerId: string,
    expectedRevision: number,
  ): Promise<Ack<LobbySnapshot>> {
    return this.send(
      'record game log event',
      gameLogAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.GAME_LOG_RECORD,
        gameLogRecordCommandSchema.parse({ eventType, targetPlayerId, expectedRevision }),
        callback,
      ),
    )
  }

  editGameLogEvent(
    eventId: string,
    targetPlayerId: string,
    expectedRevision: number,
  ): Promise<Ack<LobbySnapshot>> {
    return this.send(
      'edit game log event',
      gameLogAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.GAME_LOG_EDIT,
        gameLogEditCommandSchema.parse({ eventId, targetPlayerId, expectedRevision }),
        callback,
      ),
    )
  }

  deleteGameLogEvent(
    eventId: string,
    expectedRevision: number,
  ): Promise<Ack<LobbySnapshot>> {
    return this.send(
      'delete game log event',
      gameLogAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.GAME_LOG_DELETE,
        gameLogDeleteCommandSchema.parse({ eventId, expectedRevision }),
        callback,
      ),
    )
  }

  keepAlive(): Promise<Ack<EmptyResponse>> {
    return this.send(
      'keep alive',
      emptyAckSchema,
      (callback) => this.socket.emit(SOCKET_EVENT.KEEP_ALIVE, {}, callback),
    )
  }

  private send<T>(
    operation: string,
    schema: ZodType<Ack<T>>,
    emit: (callback: (response: Ack<T>) => void) => void,
  ): Promise<Ack<T>> {
    return new Promise((resolve, reject) => {
      let settled = false
      const timeout = window.setTimeout(() => {
        settled = true
        reject(new GatewayTimeoutError(operation))
      }, CLIENT_TIMING.ACK_TIMEOUT_MS)

      emit((response) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        try {
          resolve(schema.parse(response))
        } catch (error) {
          reject(error)
        }
      })
    })
  }
}

let gateway: LobbyGateway | undefined

export function getLobbyGateway(): LobbyGateway {
  gateway ??= new SocketLobbyGateway(getSocket())
  return gateway
}
