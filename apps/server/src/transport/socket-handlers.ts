import { type ZodType } from 'zod'

import {
  ERROR_CODE,
  ROOM_CLOSED_REASON,
  ROOM_ID,
  SESSION_DESTINATION,
  SESSION_ENDED_REASON,
  SOCKET_EVENT,
  ackFailure,
  ackSuccess,
  emptyCommandSchema,
  gameStartedEventSchema,
  hostKickCommandSchema,
  roomClosedEventSchema,
  roomEnterCommandSchema,
  sessionEndedEventSchema,
  sessionResumeCommandSchema,
  systemReadyEventSchema,
  type AckCallback,
  type ClientRequestId,
  type EmptyResponse,
  type PlayerName,
  type RoomEntryResponse,
  type RoomSnapshot,
  type SessionCredentials,
} from '@lgu/contracts'

import type { LobbyService } from '../application/lobby-service'
import {
  invalidPayloadError,
  toPublicError,
} from '../application/public-error-mapper'
import { LobbyError } from '../domain/lobby-error'
import type { SessionCommand } from '../domain/lobby-types'
import type {
  AuthenticatedSocketData,
  GameSocket,
  GameSocketServer,
} from './socket-types'

const MESSAGE = {
  READY: 'Le serveur temps réel V3 est connecté.',
  LEFT: 'Vous avez quitté la partie.',
  KICKED: 'Vous avez été expulsé de la partie.',
  EXPIRED: 'Votre session a expiré.',
  HOST_LEFT: 'Le maître du jeu a quitté la partie.',
  ROOM_EXPIRED: 'La partie a expiré.',
} as const

const ENTER_REQUEST_TTL_MS = 5 * 60 * 1_000

interface CachedEnterRequest {
  readonly playerName: PlayerName
  readonly pending: Promise<RoomEntryResponse>
  response: RoomEntryResponse | null
  expiresAt: number
}

export interface SocketHandlerOptions {
  readonly onUnexpectedError?: (error: unknown) => void
}

function parseCommand<T>(schema: ZodType<T>, command: unknown): T {
  const result = schema.safeParse(command)
  if (!result.success) {
    const error = invalidPayloadError()
    throw new LobbyError(error.code, error.message)
  }
  return result.data
}

function reportUnexpectedError(
  handler: (error: unknown) => void,
  error: unknown,
): void {
  try {
    handler(error)
  } catch {
    // Error reporting must never break the realtime command loop.
  }
}

async function acknowledge<T>(
  callback: AckCallback<T>,
  operation: () => Promise<T>,
  onUnexpectedError: (error: unknown) => void,
): Promise<void> {
  let response
  try {
    response = ackSuccess(await operation())
  } catch (error) {
    if (!(error instanceof LobbyError)) {
      reportUnexpectedError(onUnexpectedError, error)
    }
    response = ackFailure(toPublicError(error))
  }

  try {
    callback(response)
  } catch (error) {
    reportUnexpectedError(onUnexpectedError, error)
  }
}

function dispatchAcknowledged<T>(
  callback: AckCallback<T>,
  operation: () => Promise<T>,
  onUnexpectedError: (error: unknown) => void,
): void {
  if (typeof callback !== 'function') {
    reportUnexpectedError(
      onUnexpectedError,
      new Error('Socket command received without acknowledgement callback'),
    )
    return
  }
  void acknowledge(callback, operation, onUnexpectedError)
}

function assertUnboundSocket(socket: GameSocket): void {
  if (socket.data.sessionToken || socket.data.playerId) {
    throw new LobbyError(
      ERROR_CODE.INVALID_PAYLOAD,
      'Cette connexion possède déjà une session active.',
    )
  }
}

function bindSession(
  socket: GameSocket,
  credentials: SessionCredentials,
): void {
  socket.data.playerId = credentials.playerId
  socket.data.sessionToken = credentials.sessionToken
}

function clearSession(data: AuthenticatedSocketData): void {
  delete data.playerId
  delete data.sessionToken
}

function getSessionCommand(socket: GameSocket): SessionCommand {
  if (!socket.data.sessionToken) {
    throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
  }
  return {
    sessionToken: socket.data.sessionToken,
    connectionId: socket.id,
  }
}

function broadcastSnapshot(
  io: GameSocketServer,
  room: RoomSnapshot | null,
): void {
  if (room) io.to(ROOM_ID.MAIN).emit(SOCKET_EVENT.ROOM_SNAPSHOT, room)
}

async function emitResumedPrivateView(
  socket: GameSocket,
  service: LobbyService,
  destination: string,
): Promise<void> {
  if (destination === SESSION_DESTINATION.PLAYER_ROLE) {
    socket.emit(
      SOCKET_EVENT.PRIVATE_ASSIGNMENT,
      await service.getPrivateAssignment(getSessionCommand(socket)),
    )
  } else if (destination === SESSION_DESTINATION.GAME_MASTER) {
    socket.emit(
      SOCKET_EVENT.HOST_DASHBOARD,
      await service.getHostDashboard(getSessionCommand(socket)),
    )
  }
}

export function registerSocketHandlers(
  io: GameSocketServer,
  service: LobbyService,
  options: SocketHandlerOptions = {},
): void {
  const onUnexpectedError = options.onUnexpectedError ?? (() => undefined)
  const enterRequests = new Map<ClientRequestId, CachedEnterRequest>()

  function getCachedEnterRequest(
    requestId: ClientRequestId,
  ): CachedEnterRequest | null {
    const cached = enterRequests.get(requestId)
    if (!cached) return null
    if (cached.response && cached.expiresAt <= Date.now()) {
      enterRequests.delete(requestId)
      return null
    }
    return cached
  }

  function purgeExpiredEnterRequests(now: number): void {
    for (const [requestId, cached] of enterRequests) {
      if (cached.response && cached.expiresAt <= now) {
        enterRequests.delete(requestId)
      }
    }
  }

  io.on('connection', (socket) => {
    socket.emit(
      SOCKET_EVENT.SYSTEM_READY,
      systemReadyEventSchema.parse({ message: MESSAGE.READY }),
    )

    socket.on(SOCKET_EVENT.ROOM_ENTER, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(roomEnterCommandSchema, rawCommand)
        const cached = command.clientRequestId
          ? getCachedEnterRequest(command.clientRequestId)
          : null

        if (cached) {
          if (cached.playerName !== command.playerName) {
            throw new LobbyError(
              ERROR_CODE.INVALID_PAYLOAD,
              'La requête d’entrée ne correspond pas au joueur initial.',
            )
          }
          const cachedResponse = cached.response ?? await cached.pending
          if (
            socket.data.sessionToken
            && socket.data.sessionToken !== cachedResponse.session.sessionToken
          ) {
            assertUnboundSocket(socket)
          }
          if (!socket.data.sessionToken) assertUnboundSocket(socket)

          const resumed = await service.resume({
            sessionToken: cachedResponse.session.sessionToken,
            connectionId: socket.id,
          })
          bindSession(socket, resumed.response.session)
          await socket.join(ROOM_ID.MAIN)
          if (resumed.replacedConnectionId) {
            io.in(resumed.replacedConnectionId).disconnectSockets(true)
          }
          if (resumed.publicStateChanged) {
            broadcastSnapshot(io, resumed.response.room)
          }
          await emitResumedPrivateView(
            socket,
            service,
            resumed.response.destination,
          )
          return {
            session: resumed.response.session,
            room: resumed.response.room,
            destination: resumed.response.destination,
          }
        }

        assertUnboundSocket(socket)
        const pending = service.enter({
          playerName: command.playerName,
          connectionId: socket.id,
        })
        const requestRecord: CachedEnterRequest | null = command.clientRequestId
          ? {
              playerName: command.playerName,
              pending,
              response: null,
              expiresAt: Number.POSITIVE_INFINITY,
            }
          : null
        if (command.clientRequestId && requestRecord) {
          purgeExpiredEnterRequests(Date.now())
          enterRequests.set(command.clientRequestId, requestRecord)
        }

        let response: RoomEntryResponse
        try {
          response = await pending
          if (requestRecord) {
            requestRecord.response = response
            requestRecord.expiresAt = Date.now() + ENTER_REQUEST_TTL_MS
          }
        } catch (error) {
          if (command.clientRequestId) {
            enterRequests.delete(command.clientRequestId)
          }
          throw error
        }
        bindSession(socket, response.session)
        await socket.join(ROOM_ID.MAIN)
        broadcastSnapshot(io, response.room)
        return response
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.SESSION_RESUME, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        assertUnboundSocket(socket)
        const command = parseCommand(sessionResumeCommandSchema, rawCommand)
        const result = await service.resume({
          sessionToken: command.sessionToken,
          connectionId: socket.id,
        })
        bindSession(socket, result.response.session)
        await socket.join(ROOM_ID.MAIN)
        if (result.replacedConnectionId) {
          io.in(result.replacedConnectionId).disconnectSockets(true)
        }
        if (result.publicStateChanged) {
          broadcastSnapshot(io, result.response.room)
        }
        await emitResumedPrivateView(
          socket,
          service,
          result.response.destination,
        )
        return result.response
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.PLAYER_LEAVE, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async (): Promise<EmptyResponse> => {
        parseCommand(emptyCommandSchema, rawCommand)
        const result = await service.leave(getSessionCommand(socket))
        socket.emit(
          SOCKET_EVENT.SESSION_ENDED,
          sessionEndedEventSchema.parse({
            reason: SESSION_ENDED_REASON.LEFT,
            message: MESSAGE.LEFT,
          }),
        )
        clearSession(socket.data)
        await socket.leave(ROOM_ID.MAIN)
        broadcastSnapshot(io, result.room)
        if (result.roomClosedReason === ROOM_CLOSED_REASON.HOST_LEFT) {
          io.to(ROOM_ID.MAIN).emit(
            SOCKET_EVENT.ROOM_CLOSED,
            roomClosedEventSchema.parse({
              reason: ROOM_CLOSED_REASON.HOST_LEFT,
              message: MESSAGE.HOST_LEFT,
            }),
          )
          io.in(ROOM_ID.MAIN).disconnectSockets(true)
        }
        return {}
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.HOST_KICK, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(hostKickCommandSchema, rawCommand)
        const result = await service.kick(
          getSessionCommand(socket),
          command.playerId,
        )
        if (result.connectionId) {
          io.to(result.connectionId).emit(
            SOCKET_EVENT.SESSION_ENDED,
            sessionEndedEventSchema.parse({
              reason: SESSION_ENDED_REASON.KICKED,
              message: MESSAGE.KICKED,
            }),
          )
          io.in(result.connectionId).disconnectSockets(true)
        }
        broadcastSnapshot(io, result.room)
        if (!result.room) throw new Error('Kick removed the room')
        return result.room
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.GAME_START, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async (): Promise<EmptyResponse> => {
        parseCommand(emptyCommandSchema, rawCommand)
        const result = await service.start(getSessionCommand(socket))
        broadcastSnapshot(io, result.room)
        io.to(ROOM_ID.MAIN).emit(
          SOCKET_EVENT.GAME_STARTED,
          gameStartedEventSchema.parse({
            roomRevision: result.room.revision,
            startedAt: result.startedAt,
          }),
        )
        for (const delivery of result.privateAssignments) {
          io.to(delivery.connectionId).emit(
            SOCKET_EVENT.PRIVATE_ASSIGNMENT,
            delivery.assignment,
          )
        }
        io.to(result.hostDashboard.connectionId).emit(
          SOCKET_EVENT.HOST_DASHBOARD,
          result.hostDashboard.dashboard,
        )
        return {}
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.KEEP_ALIVE, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async (): Promise<EmptyResponse> => {
        parseCommand(emptyCommandSchema, rawCommand)
        await service.keepAlive(getSessionCommand(socket))
        return {}
      }, onUnexpectedError)
    })

    socket.on('disconnect', () => {
      void service.disconnect(socket.id)
        .then((result) => {
          if (result.changed) broadcastSnapshot(io, result.room)
        })
        .catch((error) => reportUnexpectedError(onUnexpectedError, error))
    })
  })
}

export async function runCleanup(
  io: GameSocketServer,
  service: LobbyService,
): Promise<void> {
  const result = await service.cleanup()
  if (result.removedPlayerIds.length > 0) {
    const removedIds = new Set(result.removedPlayerIds)
    const sockets = await io.fetchSockets()
    for (const socket of sockets) {
      if (socket.data.playerId && removedIds.has(socket.data.playerId)) {
        socket.emit(
          SOCKET_EVENT.SESSION_ENDED,
          sessionEndedEventSchema.parse({
            reason: SESSION_ENDED_REASON.EXPIRED,
            message: MESSAGE.EXPIRED,
          }),
        )
        socket.disconnect(true)
      }
    }
    broadcastSnapshot(io, result.room)
  }
  if (result.roomExpired && result.room) {
    broadcastSnapshot(io, result.room)
    io.to(ROOM_ID.MAIN).emit(
      SOCKET_EVENT.ROOM_CLOSED,
      roomClosedEventSchema.parse({
        reason: ROOM_CLOSED_REASON.EXPIRED,
        message: MESSAGE.ROOM_EXPIRED,
      }),
    )
    io.in(ROOM_ID.MAIN).disconnectSockets(true)
  }
  if (result.roomPurged) {
    io.in(ROOM_ID.MAIN).disconnectSockets(true)
  }
}
