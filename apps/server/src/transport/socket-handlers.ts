import { type ZodType } from 'zod'

import {
  ERROR_CODE,
  LOBBY_CLOSED_REASON,
  LOBBY_ID,
  SESSION_DESTINATION,
  SESSION_ENDED_REASON,
  SOCKET_EVENT,
  ackFailure,
  ackSuccess,
  emptyCommandSchema,
  gameStartedEventSchema,
  hostKickCommandSchema,
  lobbyClosedEventSchema,
  lobbyCreateCommandSchema,
  lobbyEnterCommandSchema,
  lobbyJoinCommandSchema,
  lobbyListResponseSchema,
  sessionEndedEventSchema,
  sessionResumeCommandSchema,
  systemReadyEventSchema,
  type AckCallback,
  type ClientRequestId,
  type EmptyResponse,
  type PlayerName,
  type LobbyEntryResponse,
  type LobbyId,
  type LobbySnapshot,
  type SessionCredentials,
} from '@lgu/contracts'

import type { LobbyService } from '../application/lobby-service'
import { LobbyRegistry } from '../application/lobby-registry'
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
  LOBBY_EXPIRED: 'La partie a expiré.',
} as const

const ENTER_REQUEST_TTL_MS = 5 * 60 * 1_000

interface CachedEnterRequest {
  readonly playerName: PlayerName
  readonly pending: Promise<LobbyEntryResponse>
  response: LobbyEntryResponse | null
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
  socket.data.lobbyId = credentials.lobbyId ?? LOBBY_ID.MAIN
  socket.data.playerId = credentials.playerId
  socket.data.sessionToken = credentials.sessionToken
}

function clearSession(data: AuthenticatedSocketData): void {
  delete data.lobbyId
  delete data.playerId
  delete data.sessionToken
}

function getLobbyId(socket: GameSocket): LobbyId {
  if (!socket.data.lobbyId) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
  return socket.data.lobbyId
}

function getSessionCommand(socket: GameSocket): SessionCommand {
  if (!socket.data.sessionToken) throw new LobbyError(ERROR_CODE.SESSION_NOT_FOUND, 'Session introuvable.')
  return { sessionToken: socket.data.sessionToken, connectionId: socket.id }
}

function broadcastSnapshot(io: GameSocketServer, lobby: LobbySnapshot | null): void {
  if (lobby) io.to(lobby.id).emit(SOCKET_EVENT.LOBBY_SNAPSHOT, lobby)
}

async function emitResumedPrivateView(socket: GameSocket, service: LobbyService, destination: string): Promise<void> {
  if (destination === SESSION_DESTINATION.PLAYER_ROLE) {
    socket.emit(SOCKET_EVENT.PRIVATE_ASSIGNMENT, await service.getPrivateAssignment(getSessionCommand(socket)))
  } else if (destination === SESSION_DESTINATION.GAME_MASTER) {
    socket.emit(SOCKET_EVENT.HOST_DASHBOARD, await service.getHostDashboard(getSessionCommand(socket)))
  }
}

export function registerSocketHandlers(io: GameSocketServer, source: LobbyService | LobbyRegistry, options: SocketHandlerOptions = {}): void {
  const onUnexpectedError = options.onUnexpectedError ?? (() => undefined)
  const registry = source instanceof LobbyRegistry ? source : new LobbyRegistry(() => source)
  if (!(source instanceof LobbyRegistry)) registry.register(LOBBY_ID.MAIN, source)
  const enterRequests = new Map<ClientRequestId, CachedEnterRequest>()

  const serviceFor = (socket: GameSocket): LobbyService => {
    const service = registry.get(getLobbyId(socket))
    if (!service) throw new LobbyError(ERROR_CODE.LOBBY_NOT_FOUND, 'Ce lobby n’existe plus.')
    return service
  }

  const completeEntry = async (socket: GameSocket, response: LobbyEntryResponse): Promise<LobbyEntryResponse> => {
    bindSession(socket, response.session)
    await socket.join(response.lobby.id)
    broadcastSnapshot(io, response.lobby)
    return response
  }

  io.on('connection', (socket) => {
    socket.emit(SOCKET_EVENT.SYSTEM_READY, systemReadyEventSchema.parse({ message: MESSAGE.READY }))

    socket.on(SOCKET_EVENT.LOBBY_LIST, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        parseCommand(emptyCommandSchema, rawCommand)
        return lobbyListResponseSchema.parse(await registry.list())
      }, onUnexpectedError)
    })

    const createLobby = async (playerName: PlayerName, clientRequestId?: ClientRequestId): Promise<LobbyEntryResponse> => {
      const cached = clientRequestId ? enterRequests.get(clientRequestId) : null
      if (cached) return cached.response ?? cached.pending
      assertUnboundSocket(socket)
      const { lobbyId, service } = registry.createLobby()
      const pending = service.enter({ lobbyId, playerName, connectionId: socket.id })
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
        registry.removeIfEmpty(lobbyId)
        throw error
      }
    }

    socket.on(SOCKET_EVENT.LOBBY_CREATE, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(lobbyCreateCommandSchema, rawCommand)
        return createLobby(command.playerName, command.clientRequestId)
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.LOBBY_ENTER, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(lobbyEnterCommandSchema, rawCommand)
        return createLobby(command.playerName, command.clientRequestId)
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.LOBBY_JOIN, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        const command = parseCommand(lobbyJoinCommandSchema, rawCommand)
        assertUnboundSocket(socket)
        const service = registry.get(command.lobbyId)
        if (!service) throw new LobbyError(ERROR_CODE.LOBBY_NOT_FOUND, 'Ce lobby n’existe plus.')
        const response = await service.enter({ lobbyId: command.lobbyId, playerName: command.playerName, connectionId: socket.id })
        return completeEntry(socket, response)
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.SESSION_RESUME, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async () => {
        assertUnboundSocket(socket)
        const command = parseCommand(sessionResumeCommandSchema, rawCommand)
        const lobbyId = command.lobbyId ?? LOBBY_ID.MAIN
        const service = registry.get(lobbyId)
        if (!service) throw new LobbyError(ERROR_CODE.LOBBY_NOT_FOUND, 'Ce lobby n’existe plus.')
        const result = await service.resume({ sessionToken: command.sessionToken, connectionId: socket.id })
        bindSession(socket, result.response.session)
        await socket.join(lobbyId)
        if (result.replacedConnectionId) io.in(result.replacedConnectionId).disconnectSockets(true)
        if (result.publicStateChanged) broadcastSnapshot(io, result.response.lobby)
        await emitResumedPrivateView(socket, service, result.response.destination)
        return result.response
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.PLAYER_LEAVE, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async (): Promise<EmptyResponse> => {
        parseCommand(emptyCommandSchema, rawCommand)
        const lobbyId = getLobbyId(socket)
        const result = await serviceFor(socket).leave(getSessionCommand(socket))
        socket.emit(SOCKET_EVENT.SESSION_ENDED, sessionEndedEventSchema.parse({ reason: SESSION_ENDED_REASON.LEFT, message: MESSAGE.LEFT }))
        clearSession(socket.data)
        await socket.leave(lobbyId)
        broadcastSnapshot(io, result.lobby)
        if (result.lobbyClosedReason === LOBBY_CLOSED_REASON.HOST_LEFT) {
          io.to(lobbyId).emit(SOCKET_EVENT.LOBBY_CLOSED, lobbyClosedEventSchema.parse({ reason: LOBBY_CLOSED_REASON.HOST_LEFT, message: MESSAGE.HOST_LEFT }))
          io.in(lobbyId).disconnectSockets(true)
        }
        await registry.removeIfEmpty(lobbyId)
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
        broadcastSnapshot(io, result.lobby)
        if (!result.lobby) throw new Error('Kick removed the lobby')
        return result.lobby
      }, onUnexpectedError)
    })

    socket.on(SOCKET_EVENT.GAME_START, (rawCommand, callback) => {
      dispatchAcknowledged(callback, async (): Promise<EmptyResponse> => {
        parseCommand(emptyCommandSchema, rawCommand)
        const lobbyId = getLobbyId(socket)
        const result = await serviceFor(socket).start(getSessionCommand(socket))
        broadcastSnapshot(io, result.lobby)
        io.to(lobbyId).emit(SOCKET_EVENT.GAME_STARTED, gameStartedEventSchema.parse({ lobbyRevision: result.lobby.revision, startedAt: result.startedAt }))
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
      const lobbyId = socket.data.lobbyId
      if (!lobbyId) return
      const service = registry.get(lobbyId)
      if (!service) return
      void service.disconnect(socket.id).then((result) => {
        if (result.changed) broadcastSnapshot(io, result.lobby)
        return registry.removeIfEmpty(lobbyId)
      }).catch((error) => reportUnexpectedError(onUnexpectedError, error))
    })
  })
}

export async function runCleanup(io: GameSocketServer, registry: LobbyRegistry): Promise<void> {
  for (const lobbyId of await registry.allLobbyIds()) {
    const service = registry.get(lobbyId)
    if (!service) continue
    const result = await service.cleanup()
    if (result.removedPlayerIds.length > 0) {
      const removedIds = new Set(result.removedPlayerIds)
      const sockets = await io.fetchSockets()
      for (const socket of sockets) {
        if (socket.data.lobbyId === lobbyId && socket.data.playerId && removedIds.has(socket.data.playerId)) {
          socket.emit(SOCKET_EVENT.SESSION_ENDED, sessionEndedEventSchema.parse({ reason: SESSION_ENDED_REASON.EXPIRED, message: MESSAGE.EXPIRED }))
          socket.disconnect(true)
        }
      }
      broadcastSnapshot(io, result.lobby)
    }
    await registry.removeIfEmpty(lobbyId)
  }
  await registry.cleanup()
}
