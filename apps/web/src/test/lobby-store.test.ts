import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ERROR_CODE,
  ROOM_ID,
  ROOM_PHASE,
  SESSION_DESTINATION,
  ackFailure,
  ackSuccess,
  type Ack,
  type EmptyResponse,
  type PlayerId,
  type RoomEntryResponse,
  type RoomSnapshot,
  type SessionCredentials,
  type SessionResumeResponse,
  type SessionToken,
} from '@lgu/contracts'

import { CLIENT_TIMING, CONNECTION_STATE } from '../constants/app'
import type {
  LobbyGateway,
  LobbyGatewayHandlers,
} from '../services/lobby-gateway'
import type { SessionStorage } from '../services/session-storage'
import { createLobbyStoreDefinition } from '../stores/lobby'

const SESSION: SessionCredentials = {
  playerId: 'player_1',
  sessionToken: 'session_00000000000000000000000000000001',
}

function createRoom(revision = 1): RoomSnapshot {
  return {
    id: ROOM_ID.MAIN,
    phase: ROOM_PHASE.LOBBY,
    revision,
    players: [
      {
        id: SESSION.playerId,
        name: 'Marc',
        isHost: true,
        connected: true,
      },
    ],
    minimumPlayers: 5,
    maximumPlayers: 12,
    canStart: false,
    createdAt: 1,
  }
}

class FakeStorage implements SessionStorage {
  value: SessionCredentials | null
  readonly save = vi.fn((credentials: SessionCredentials) => {
    this.value = credentials
  })
  readonly clear = vi.fn(() => {
    this.value = null
  })

  constructor(initial: SessionCredentials | null = null) {
    this.value = initial
  }

  load(): SessionCredentials | null {
    return this.value
  }
}

class FakeGateway implements LobbyGateway {
  handlers: LobbyGatewayHandlers | null = null
  resumeResponse: Ack<SessionResumeResponse> = ackSuccess({
    session: SESSION,
    room: createRoom(),
    destination: SESSION_DESTINATION.LOBBY,
  })
  enterResponse: Ack<RoomEntryResponse> = ackSuccess({
    session: SESSION,
    room: createRoom(),
    destination: SESSION_DESTINATION.LOBBY,
  })
  readonly connect = vi.fn(async () => undefined)
  readonly reconnect = vi.fn(async () => undefined)
  readonly resume = vi.fn(async (_token: SessionToken) => this.resumeResponse)
  readonly enter = vi.fn(async (_name: string) => this.enterResponse)
  readonly leave = vi.fn(async (): Promise<Ack<EmptyResponse>> => ackSuccess({}))
  readonly kick = vi.fn(async (_id: PlayerId) => ackSuccess(createRoom(2)))
  readonly start = vi.fn(async (): Promise<Ack<EmptyResponse>> => ackSuccess({}))
  readonly keepAlive = vi.fn(async (): Promise<Ack<EmptyResponse>> => ackSuccess({}))

  subscribe(handlers: LobbyGatewayHandlers): () => void {
    this.handlers = handlers
    return () => {
      this.handlers = null
    }
  }
}

function createStore(
  gateway: FakeGateway,
  storage: FakeStorage,
) {
  const useStore = createLobbyStoreDefinition(
    `lobby-test-${Math.random()}`,
    { getGateway: () => gateway, storage },
  )
  return useStore()
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('lobby store', () => {
  it('hydrates and resumes a stored session', async () => {
    const gateway = new FakeGateway()
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)

    await store.initialize()

    expect(gateway.connect).toHaveBeenCalledOnce()
    expect(gateway.resume).toHaveBeenCalledWith(SESSION.sessionToken)
    expect(store.connectionState).toBe(CONNECTION_STATE.ONLINE)
    expect(store.room?.revision).toBe(1)
    expect(store.isHost).toBe(true)
    expect(store.destination).toBe(SESSION_DESTINATION.LOBBY)
    store.dispose()
  })

  it('clears invalid persisted sessions', async () => {
    const gateway = new FakeGateway()
    gateway.resumeResponse = ackFailure({
      code: ERROR_CODE.SESSION_NOT_FOUND,
      message: 'Session introuvable.',
    })
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)

    await store.initialize()

    expect(store.hasSession).toBe(false)
    expect(store.room).toBeNull()
    expect(storage.clear).toHaveBeenCalledOnce()
    store.dispose()
  })

  it('persists entry and ignores stale public snapshots', async () => {
    const gateway = new FakeGateway()
    gateway.enterResponse = ackSuccess({
      session: SESSION,
      room: createRoom(4),
      destination: SESSION_DESTINATION.LOBBY,
    })
    const storage = new FakeStorage()
    const store = createStore(gateway, storage)
    await store.initialize()

    expect(await store.enter(' Marc ')).toBe(true)
    expect(gateway.enter).toHaveBeenCalledWith('Marc')
    expect(storage.save).toHaveBeenCalledWith(SESSION)

    gateway.handlers?.onRoomSnapshot(createRoom(3))
    expect(store.room?.revision).toBe(4)
    store.dispose()
  })

  it('routes private events into separate player and MJ state', async () => {
    const gateway = new FakeGateway()
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)
    await store.initialize()

    gateway.handlers?.onPrivateAssignment({
      player: { id: SESSION.playerId, name: 'Marc' },
      role: {
        id: 'villageois',
        team: 'villagers',
        category: 'villager',
      },
      roleAccessToken: 'role_00000000000000000000000000000000001',
      bluffRoleId: null,
      specialInformation: null,
    })
    expect(store.destination).toBe(SESSION_DESTINATION.PLAYER_ROLE)
    expect(store.privateAssignment?.player.id).toBe(SESSION.playerId)
    expect(store.hostDashboard).toBeNull()

    gateway.handlers?.onHostDashboard({
      players: [],
      playerCount: 1,
      werewolfCount: 0,
      villagerTeamCount: 1,
    })
    expect(store.destination).toBe(SESSION_DESTINATION.GAME_MASTER)
    expect(store.hostDashboard).not.toBeNull()
    store.dispose()
  })

  it('ignores a late resume after the user abandons the stored session', async () => {
    let resolveResume: (value: Ack<SessionResumeResponse>) => void = () => {
      throw new Error('Resume promise was not initialized')
    }
    const gateway = new FakeGateway()
    gateway.resume.mockImplementation(() => new Promise((resolve) => {
      resolveResume = resolve
    }))
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)

    const initializing = store.initialize()
    await Promise.resolve()
    await store.startNewSession()
    resolveResume(ackSuccess({
      session: SESSION,
      room: createRoom(),
      destination: SESSION_DESTINATION.LOBBY,
    }))
    await initializing

    expect(gateway.leave).toHaveBeenCalledOnce()
    expect(store.hasStoredSession).toBe(false)
    expect(store.room).toBeNull()
    expect(storage.value).toBeNull()
    store.dispose()
  })

  it('reconnects if a started snapshot arrives without its private view', async () => {
    vi.useFakeTimers()
    const gateway = new FakeGateway()
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)
    await store.initialize()
    gateway.reconnect.mockClear()

    gateway.handlers?.onRoomSnapshot({
      ...createRoom(2),
      phase: ROOM_PHASE.STARTED,
      canStart: false,
    })
    await vi.advanceTimersByTimeAsync(
      CLIENT_TIMING.PRIVATE_VIEW_RECOVERY_DELAY_MS,
    )

    expect(gateway.reconnect).toHaveBeenCalledOnce()
    store.dispose()
  })

})
