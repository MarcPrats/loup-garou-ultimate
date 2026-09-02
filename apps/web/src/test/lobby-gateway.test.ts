import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  LOBBY_ID,
  LOBBY_PHASE,
  SESSION_DESTINATION,
  SOCKET_EVENT,
  ackSuccess,
  type LobbyEntryResponse,
} from '@lgu/contracts'

import { CLIENT_TIMING, CONNECTION_STATE } from '../constants/app'
import {
  GatewayTimeoutError,
  SocketLobbyGateway,
  type LobbyGatewayHandlers,
} from '../services/lobby-gateway'
import type { GameSocket } from '../services/socket'

const ENTRY: LobbyEntryResponse = {
  session: {
    lobbyId: LOBBY_ID.MAIN,
    playerId: 'player_1',
    sessionToken: 'session_00000000000000000000000000000001',
  },
  lobby: {
    id: LOBBY_ID.MAIN,
    phase: LOBBY_PHASE.LOBBY,
    gamePhase: null,
    gameEnded: false,
    gameLog: [],
    dayVotingEnabled: false,
    dayVote: null,
    revision: 1,
    players: [{
      id: 'player_1',
      name: 'Marc',
      isHost: true,
      connected: true,
      alive: true,
    }],
    minimumPlayers: 5,
    maximumPlayers: 12,
    canStart: false,
    createdAt: 1,
  },
  destination: SESSION_DESTINATION.LOBBY,
}

class FakeSocket {
  connected = false
  readonly listeners = new Map<string, Set<(...args: never[]) => void>>()
  readonly managerListeners = new Map<string, Set<(...args: never[]) => void>>()
  readonly io = {
    on: (event: string, handler: (...args: never[]) => void) => {
      this.add(this.managerListeners, event, handler)
    },
    off: (event: string, handler: (...args: never[]) => void) => {
      this.managerListeners.get(event)?.delete(handler)
    },
  }
  emitImplementation: ((event: string, args: unknown[]) => void) | null = null

  on(event: string, handler: (...args: never[]) => void): this {
    this.add(this.listeners, event, handler)
    return this
  }

  off(event: string, handler: (...args: never[]) => void): this {
    this.listeners.get(event)?.delete(handler)
    return this
  }

  emit(event: string, ...args: unknown[]): this {
    this.emitImplementation?.(event, args)
    return this
  }

  connect(): this {
    return this
  }

  disconnect(): this {
    this.connected = false
    return this
  }

  fire(event: string): void {
    for (const handler of this.listeners.get(event) ?? []) handler()
  }

  private add(
    target: Map<string, Set<(...args: never[]) => void>>,
    event: string,
    handler: (...args: never[]) => void,
  ): void {
    const handlers = target.get(event) ?? new Set()
    handlers.add(handler)
    target.set(event, handlers)
  }
}

function createHandlers(): LobbyGatewayHandlers {
  return {
    onConnectionState: vi.fn(),
    onSystemReady: vi.fn(),
    onLobbySnapshot: vi.fn(),
    onGameStarted: vi.fn(),
    onPrivateAssignment: vi.fn(),
    onDayVotePrivateStatus: vi.fn(),
    onHostDashboard: vi.fn(),
    onStartPreview: vi.fn(),
    onLobbyClosed: vi.fn(),
    onSessionEnded: vi.fn(),
    onNotification: vi.fn(),
    onProtocolError: vi.fn(),
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SocketLobbyGateway', () => {
  it('validates typed acknowledgements', async () => {
    const socket = new FakeSocket()
    socket.emitImplementation = (event, args) => {
      expect(event).toBe(SOCKET_EVENT.LOBBY_ENTER)
      const callback = args.at(-1) as (value: unknown) => void
      callback(ackSuccess(ENTRY))
    }
    const gateway = new SocketLobbyGateway(socket as unknown as GameSocket)

    await expect(gateway.enter('Marc')).resolves.toEqual(ackSuccess(ENTRY))
  })

  it('retries a timed-out entry with the same idempotency key', async () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const commands: unknown[] = []
    socket.emitImplementation = (_event, args) => {
      commands.push(args[0])
      if (commands.length === 2) {
        const callback = args.at(-1) as (value: unknown) => void
        callback(ackSuccess(ENTRY))
      }
    }
    const gateway = new SocketLobbyGateway(socket as unknown as GameSocket)

    const pending = gateway.enter('Marc')
    await vi.advanceTimersByTimeAsync(CLIENT_TIMING.ACK_TIMEOUT_MS)

    await expect(pending).resolves.toEqual(ackSuccess(ENTRY))
    expect(commands).toHaveLength(2)
    expect(commands[0]).toEqual(commands[1])
  })

  it('times out commands and removes persistent listeners on dispose', async () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const gateway = new SocketLobbyGateway(socket as unknown as GameSocket)
    const handlers = createHandlers()
    const dispose = gateway.subscribe(handlers)

    socket.fire('connect')
    expect(handlers.onConnectionState).toHaveBeenCalledWith(
      CONNECTION_STATE.ONLINE,
    )

    const pending = gateway.enter('Marc')
    const rejection = expect(pending).rejects.toBeInstanceOf(GatewayTimeoutError)
    await vi.advanceTimersByTimeAsync(CLIENT_TIMING.ACK_TIMEOUT_MS * 2)
    await rejection

    dispose()
    socket.fire('connect')
    expect(handlers.onConnectionState).toHaveBeenCalledTimes(1)
  })
})
