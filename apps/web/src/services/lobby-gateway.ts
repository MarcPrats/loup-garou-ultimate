import type { ZodType } from 'zod'

import {
  SOCKET_EVENT,
  createAckSchema,
  emptyResponseSchema,
  gameStartedEventSchema,
  hostDashboardSchema,
  notificationEventSchema,
  privateAssignmentSchema,
  roomClosedEventSchema,
  roomEntryResponseSchema,
  roomSnapshotSchema,
  sessionEndedEventSchema,
  sessionResumeResponseSchema,
  systemReadyEventSchema,
  type Ack,
  type ClientRequestId,
  type EmptyResponse,
  type GameStartedEvent,
  type HostDashboard,
  type NotificationEvent,
  type PlayerId,
  type PrivateAssignment,
  type RoomClosedEvent,
  type RoomEntryResponse,
  type RoomSnapshot,
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

const roomEntryAckSchema = createAckSchema(roomEntryResponseSchema)
const sessionResumeAckSchema = createAckSchema(sessionResumeResponseSchema)
const roomSnapshotAckSchema = createAckSchema(roomSnapshotSchema)
const emptyAckSchema = createAckSchema(emptyResponseSchema)

export interface LobbyGatewayHandlers {
  readonly onConnectionState: (state: ConnectionState) => void
  readonly onSystemReady: (event: SystemReadyEvent) => void
  readonly onRoomSnapshot: (snapshot: RoomSnapshot) => void
  readonly onGameStarted: (event: GameStartedEvent) => void
  readonly onPrivateAssignment: (assignment: PrivateAssignment) => void
  readonly onHostDashboard: (dashboard: HostDashboard) => void
  readonly onRoomClosed: (event: RoomClosedEvent) => void
  readonly onSessionEnded: (event: SessionEndedEvent) => void
  readonly onNotification: (event: NotificationEvent) => void
  readonly onProtocolError: () => void
}

export interface LobbyGateway {
  connect(): Promise<void>
  reconnect(): Promise<void>
  disconnect(): void
  subscribe(handlers: LobbyGatewayHandlers): () => void
  enter(playerName: string): Promise<Ack<RoomEntryResponse>>
  resume(sessionToken: SessionToken): Promise<Ack<SessionResumeResponse>>
  leave(): Promise<Ack<EmptyResponse>>
  kick(playerId: PlayerId): Promise<Ack<RoomSnapshot>>
  start(): Promise<Ack<EmptyResponse>>
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
    const onRoomSnapshot = (value: unknown) => {
      deliverEvent(roomSnapshotSchema, value, handlers.onRoomSnapshot, handlers.onProtocolError)
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
    const onRoomClosed = (value: unknown) => {
      deliverEvent(roomClosedEventSchema, value, handlers.onRoomClosed, handlers.onProtocolError)
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
    this.socket.on(SOCKET_EVENT.ROOM_SNAPSHOT, onRoomSnapshot)
    this.socket.on(SOCKET_EVENT.GAME_STARTED, onGameStarted)
    this.socket.on(SOCKET_EVENT.PRIVATE_ASSIGNMENT, onPrivateAssignment)
    this.socket.on(SOCKET_EVENT.HOST_DASHBOARD, onHostDashboard)
    this.socket.on(SOCKET_EVENT.ROOM_CLOSED, onRoomClosed)
    this.socket.on(SOCKET_EVENT.SESSION_ENDED, onSessionEnded)
    this.socket.on(SOCKET_EVENT.NOTIFICATION, onNotification)

    return () => {
      this.socket.off('connect', onConnect)
      this.socket.off('disconnect', onDisconnect)
      this.socket.off('connect_error', onConnectError)
      this.socket.io.off('reconnect_attempt', onReconnectAttempt)
      this.socket.off(SOCKET_EVENT.SYSTEM_READY, onSystemReady)
      this.socket.off(SOCKET_EVENT.ROOM_SNAPSHOT, onRoomSnapshot)
      this.socket.off(SOCKET_EVENT.GAME_STARTED, onGameStarted)
      this.socket.off(SOCKET_EVENT.PRIVATE_ASSIGNMENT, onPrivateAssignment)
      this.socket.off(SOCKET_EVENT.HOST_DASHBOARD, onHostDashboard)
      this.socket.off(SOCKET_EVENT.ROOM_CLOSED, onRoomClosed)
      this.socket.off(SOCKET_EVENT.SESSION_ENDED, onSessionEnded)
      this.socket.off(SOCKET_EVENT.NOTIFICATION, onNotification)
    }
  }

  async enter(playerName: string): Promise<Ack<RoomEntryResponse>> {
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
      'room entry',
      roomEntryAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.ROOM_ENTER,
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

  resume(sessionToken: SessionToken): Promise<Ack<SessionResumeResponse>> {
    return this.send(
      'session resume',
      sessionResumeAckSchema,
      (callback) => this.socket.emit(
        SOCKET_EVENT.SESSION_RESUME,
        { sessionToken },
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

  kick(playerId: PlayerId): Promise<Ack<RoomSnapshot>> {
    return this.send(
      'kick',
      roomSnapshotAckSchema,
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
