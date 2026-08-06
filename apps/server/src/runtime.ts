import { fileURLToPath } from 'node:url'

import { Server as SocketIoServer } from 'socket.io'

import { LOBBY_ID } from '@lgu/contracts'

import { LobbyService } from './application/lobby-service'
import { LobbyRegistry } from './application/lobby-registry'
import { LOBBY_TIME_LIMIT } from './config/lobby-constants'
import { InMemoryLobbyRepository } from './infrastructure/in-memory-lobby-repository'
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
    repository: new InMemoryLobbyRepository(),
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
  readonly lobbyRegistry: LobbyRegistry
  close(): Promise<void>
}

export function createServerRuntime(
  options: ServerRuntimeOptions,
): ServerRuntime {
  const service = createLobbyService()
  const lobbyRegistry = new LobbyRegistry(createLobbyService)
  lobbyRegistry.register(LOBBY_ID.MAIN, service)
  const app = createHttpApp({
    service: lobbyRegistry,
    webOrigin: options.webOrigin,
    logger: options.logger ?? false,
    webRoot: options.webRoot ?? fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  })
  const io: GameSocketServer = new SocketIoServer(app.server, {
    cors: { origin: options.webOrigin },
  })

  registerSocketHandlers(io, lobbyRegistry, {
    onUnexpectedError: (error) => app.log.error(error),
  })

  const cleanupTimer = setInterval(() => {
    void runCleanup(io, lobbyRegistry).catch((error) => app.log.error(error))
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

  return { app, io, service, lobbyRegistry, close }
}
