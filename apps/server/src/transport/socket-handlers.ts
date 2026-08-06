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
  roomCreateCommandSchema,
  roomEnterCommandSchema,
  roomJoinCommandSchema,
  roomListResponseSchema,
  sessionEndedEventSchema,
  sessionResumeCommandSchema,
  systemReadyEventSchema,
  type AckCallback,
  type ClientRequestId,
  type EmptyResponse,
  type PlayerName,
  type RoomEntryResponse,
  type RoomId,
  type RoomSnapshot,
  type SessionCredentials,
} from '@lgu/contracts'

import type { LobbyService } from '../application/lobby-service'
import { RoomRegistry } from '../application/room-registry'
import { invalidPayloadError, toPublicError } from '../application/public-error-mapper'
import { LobbyError } from '../domain/lobby-error'
import type { SessionCommand } from '../domain/lobby-types'
import type { AuthenticatedSocketData, GameSocket, GameSocketServer } from './socket-types'

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

function reportUnexpectedError(handler: (error: unknown) => void, error: unknown): void {
  try { handler(error) } catch { /* keep realtime loop alive */ }
}

async function acknowledge<T>(callback: AckCallback<T>, operation: () => Promise<T>, onUnexpectedError: (error: unknown) => void): Promise<void> {
  let response
  try {
    response = ackSuccess(await operation())
  } catch (error) {
    if (!(error instanceof LobbyError)) reportUnexpectedError(onUnexpectedError, error)
    response = ackFailure(toPublicError(error))
  }
  try { callback(response) } catch (error) { reportUnexpectedError(onUnexpectedError, error) }
}

function dispatchAcknowledged<T>(callback: AckCallback<T>, operation: () => Promise<T>, onUnexpectedError: (error: unknown) => void): void {
  if (typeof callback !== 'function') {
    reportUnexpectedError(onUnexpectedError, new Error('Socket command received without acknowledgement callback'))
    return
  }
  void acknowledge(callback, operation, onUnexpectedError)
}

function assertUnboundSocket(socket: GameSocket): void {
  if (socket.data.sessionToken || socket.data.playerId) {
    throw new LobbyError(ERROR_CODE.INVALID_PAYLOAD, 'Cette connexion possède déjà une session active.')
  }
}

function bindSession(socket: GameSocket, credentials: SessionCredentials): void {
  socket.data.roomId = credentials.roomId ?? ROOM_ID.MAIN
  socket.data.playerId = credentials.playerId
  socket.data.sessionToken = credentials.sessionToken
}

function clearSession(data: AuthenticatedSocketData): void {
  delete data.roomId
  delete data.playerId
  delete data.sessionToken
}

function getRoomId(socket: GameSocket): RoomId {
  if (!socket.data.roomId) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
  return socket.data.roomId
}

function getSessionCommand(socket: GameSocket): SessionCommand {
  if (!socket.data.sessionToken) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
  return { sessionToken: socket.data.sessionToken, connectionId: socket.id }
}

function broadcastSnapshot(io: GameSocketServer, room: RoomSnapshot | null): void {
  if (room) io.to(room.id).emit(SOCKET_EVENT.ROOM_SNAPSHOT, room)
}

async function emitResumedPrivateView(socket: GameSocket, service: LobbyService, destination: string): Promise<void> {
  if (destination === SESSION_DESTINATION.PLAYER_ROLE) {
    socket.emit(SOCKET_EVENT.PRIVATE_ASSIGNMENT, await service.getPrivateAssignment(getSessionCommand(socket)))
  } else if (destination === SESSION_DESTINATION.GAME_MASTER) {
    socket.emit(SOCKET_EVENT.HOST_DASHBOARD, await service.getHostDashboard(getSessionCommand(socket)))
  }
}

export function registerSocketHandlers(io: GameSocketServer, source: LobbyService | RoomRegistry, options: SocketHandlerOptions = {}): void {
  const onUnexpectedError = options.onUnexpectedError ?? (() => undefined)
  const registry = source instanceof RoomRegistry ? source : new RoomRegistry(() => source)
  if (!(source instanceof RoomRegistry)) registry.register(ROOM_ID.MAIN, source)
  const enterRequests = new Map<ClientRequestId, CachedEnterRequest>()

  const serviceFor = (socket: GameSocket): LobbyService => {
    const service = registry.get(getRoomId(socket))
    if (!service) throw new LobbyError(ERROR_CODE.ROOM_NOT_FOUND, 'Cette salle n’existe plus.')
    return service
  }

  const completeEntry = async (socket: GameSocket, response: RoomEntryResponse): Promise<RoomEntryResponse> => {
    bindSession(socket, response.session)
    await socket.join(response.room.id)
    broadcastSnapshot(io, response.room)
    return response
  }

  io.on('connection', (socket) => {
    socket.emit(SOCKET_EVENT.SYSTEM_READY, systemReadyEventSchema.parse({ message: MESSAGE.READY }))

    socket.on(SOCKET_EVENT.ROOM_LIST, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        parseCommand(emptyCommandSchema, rawCommand)
        return roomListResponseSchema.parse(await registry.list())
      }, onUnexpectedError)
    })

    const createRoom = async (playerName: PlayerName, clientRequestId?: ClientRequestId): Promise<RoomEntryResponse> => {
      const cached = clientRequestId ? enterRequests.get(clientRequestId) : null
      if (cached) return cached.response ?? cached.pending
      assertUnboundSocket(socket)
      const { roomId, service } = registry.createRoom()
      const pending = service.enter({ roomId, playerName, connectionId: socket.id })
      if (clientRequestId) enterRequests.set(clientRequestId, { playerName, pending, response: null, expiresAt: Number.POSITIVE_INFINITY })
      try {
        const response = await pending
        if (clientRequestId) {
          const record = enterRequests.get(clientRequestId)
          if (record) { record.response = response; record.expiresAt = Date.now() + ENTER_REQUEST_TTL_MS }
        }
        return completeEntry(socket, response)
      } catch (error) {
        if (clientRequestId) enterRequests.delete(clientRequestId)
        registry.removeIfEmpty(roomId)
        throw error
      }
    }

    socket.on(SOCKET_EVENT.ROOM_CREATE, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(roomCreateCommandSchema, rawCommand)
        return createRoom(command.playerName, command.clientRequestId)
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.ROOM_ENTER, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(roomEnterCommandSchema, rawCommand)
        return createRoom(command.playerName, command.clientRequestId)
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.ROOM_JOIN, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(roomJoinCommandSchema, rawCommand)
        assertUnboundSocket(socket)
        const service = registry.get(command.roomId)
        if (!service) throw new LobbyError(ERROR_CODE.ROOM_NOT_FOUND, 'Cette salle n’existe plus.')
        const response = await service.enter({ roomId: command.roomId, playerName: command.playerName, connectionId: socket.id })
        return completeEntry(socket, response)
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.SESSION_RESUME, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        assertUnboundSocket(socket)
        const command = parseCommand(sessionResumeCommandSchema, rawCommand)
        const roomId = command.roomId ?? ROOM_ID.MAIN
        const service = registry.get(roomId)
        if (!service) throw new LobbyError(ERROR_CODE.ROOM_NOT_FOUND, 'Cette salle n’existe plus.')
        const result = await service.resume({ sessionToken: command.sessionToken, connectionId: socket.id })
        bindSession(socket, result.response.session)
        await socket.join(roomId)
        if (result.replacedConnectionId) io.in(result.replacedConnectionId).disconnectSockets(true)
        if (result.publicStateChanged) broadcastSnapshot(io, result.response.room)
        await emitResumedPrivateView(socket, service, result.response.destination)
        return result.response
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.PLAYER_LEAVE, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async (): Promise<EmptyResponse> => {
        parseCommand(emptyCommandSchema, rawCommand)
        const roomId = getRoomId(socket)
        const result = await serviceFor(socket).leave(getSessionCommand(socket))
        socket.emit(SOCKET_EVENT.SESSION_ENDED, sessionEndedEventSchema.parse({ reason: SESSION_ENDED_REASON.LEFT, message: MESSAGE.LEFT }))
        clearSession(socket.data)
        await socket.leave(roomId)
        broadcastSnapshot(io, result.room)
        if (result.roomClosedReason === ROOM_CLOSED_REASON.HOST_LEFT) {
          io.to(roomId).emit(SOCKET_EVENT.ROOM_CLOSED, roomClosedEventSchema.parse({ reason: ROOM_CLOSED_REASON.HOST_LEFT, message: MESSAGE.HOST_LEFT }))
          io.in(roomId).disconnectSockets(true)
        }
        await registry.removeIfEmpty(roomId)
        return {}
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.HOST_KICK, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const result = await serviceFor(socket).kick(getSessionCommand(socket), parseCommand(hostKickCommandSchema, rawCommand).playerId)
        if (result.connectionId) {
          io.to(result.connectionId).emit(SOCKET_EVENT.SESSION_ENDED, sessionEndedEventSchema.parse({ reason: SESSION_ENDED_REASON.KICKED, message: MESSAGE.KICKED }))
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
        const roomId = getRoomId(socket)
        const result = await serviceFor(socket).start(getSessionCommand(socket))
        broadcastSnapshot(io, result.room)
        io.to(roomId).emit(SOCKET_EVENT.GAME_STARTED, gameStartedEventSchema.parse({ roomRevision: result.room.revision, startedAt: result.startedAt }))
        for (const delivery of result.privateAssignments) io.to(delivery.connectionId).emit(SOCKET_EVENT.PRIVATE_ASSIGNMENT, delivery.assignment)
        io.to(result.hostDashboard.connectionId).emit(SOCKET_EVENT.HOST_DASHBOARD, result.hostDashboard.dashboard)
        return {}
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.KEEP_ALIVE, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async (): Promise<EmptyResponse> => {
        parseCommand(emptyCommandSchema, rawCommand)
        await serviceFor(socket).keepAlive(getSessionCommand(socket))
        return {}
      }, onUnexpectedError)
    })

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId
      if (!roomId) return
      const service = registry.get(roomId)
      if (!service) return
      void service.disconnect(socket.id).then((result) => {
        if (result.changed) broadcastSnapshot(io, result.room)
        return registry.removeIfEmpty(roomId)
      }).catch((error) => reportUnexpectedError(onUnexpectedError, error))
    })
  })
}

export async function runCleanup(io: GameSocketServer, registry: RoomRegistry): Promise<void> {
  for (const roomId of await registry.allRoomIds()) {
    const service = registry.get(roomId)
    if (!service) continue
    const result = await service.cleanup()
    if (result.removedPlayerIds.length > 0) {
      const removedIds = new Set(result.removedPlayerIds)
      const sockets = await io.fetchSockets()
      for (const socket of sockets) {
        if (socket.data.roomId === roomId && socket.data.playerId && removedIds.has(socket.data.playerId)) {
          socket.emit(SOCKET_EVENT.SESSION_ENDED, sessionEndedEventSchema.parse({ reason: SESSION_ENDED_REASON.EXPIRED, message: MESSAGE.EXPIRED }))
          socket.disconnect(true)
        }
      }
      broadcastSnapshot(io, result.room)
    }
    await registry.removeIfEmpty(roomId)
  }
  await registry.cleanup()
}
