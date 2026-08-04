import { fileURLToPath } from 'node:url'

import { Server as SocketIoServer } from 'socket.io'

import { LobbyService } from './application/lobby-service'
import { LOBBY_TIME_LIMIT } from './config/lobby-constants'
import { InMemoryRoomRepository } from './infrastructure/in-memory-room-repository'
import {
  PlayerIdGenerator,
  RoleAccessTokenGenerator,
  RoleAssignmentGenerator,
  SessionTokenGenerator,
  SystemClock,
} from './infrastructure/system-adapters'
import { createHttpApp } from './transport/http-app'
import { registerSocketHandlers, runCleanup } from './transport/socket-handlers'
import type { GameSocketServer } from './transport/socket-types'

export interface ServerRuntimeOptions {
  readonly webOrigin: string
  readonly logger?: boolean
  readonly webRoot?: string
}

export function createLobbyService(): LobbyService {
  return new LobbyService({
    repository: new InMemoryRoomRepository(),
    clock: new SystemClock(),
    playerIdGenerator: new PlayerIdGenerator(),
    sessionTokenGenerator: new SessionTokenGenerator(),
    roleAccessTokenGenerator: new RoleAccessTokenGenerator(),
    assignmentGenerator: new RoleAssignmentGenerator(),
  })
}

export interface ServerRuntime {
  readonly app: ReturnType<typeof createHttpApp>
  readonly io: GameSocketServer
  readonly service: LobbyService
  close(): Promise<void>
}

export function createServerRuntime(
  options: ServerRuntimeOptions,
): ServerRuntime {
  const service = createLobbyService()
  const app = createHttpApp({
    service,
    webOrigin: options.webOrigin,
    logger: options.logger ?? false,
    webRoot: options.webRoot ?? fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  })
  const io: GameSocketServer = new SocketIoServer(app.server, {
    cors: { origin: options.webOrigin },
  })

  registerSocketHandlers(io, service, {
    onUnexpectedError: (error) => app.log.error(error),
  })

  const cleanupTimer = setInterval(() => {
    void runCleanup(io, service).catch((error) => app.log.error(error))
  }, LOBBY_TIME_LIMIT.CLEANUP_INTERVAL_MS)
  cleanupTimer.unref()

  let closePromise: Promise<void> | null = null
  app.addHook('preClose', async () => {
    clearInterval(cleanupTimer)
    io.disconnectSockets(true)
    io.engine.close()
  })

  function close(): Promise<void> {
    closePromise ??= app.close()
    return closePromise
  }

  return { app, io, service, close }
}
