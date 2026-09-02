import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ERROR_CODE,
  LOBBY_ID,
  LOBBY_PHASE,
  SESSION_DESTINATION,
  ackFailure,
  ackSuccess,
  type Ack,
  type EmptyResponse,
  type GameLogEventType,
  type GameStartPreview,
  type DayVoteChoice,
  type PlayerId,
  type LobbyEntryResponse,
  type LobbyListResponse,
  type LobbySnapshot,
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
  lobbyId: LOBBY_ID.MAIN,
  playerId: 'player_1',
  sessionToken: 'session_00000000000000000000000000000001',
}

function createLobby(revision = 1): LobbySnapshot {
  return {
    id: LOBBY_ID.MAIN,
    phase: LOBBY_PHASE.LOBBY,
    gamePhase: null,
    gameEnded: false,
    gameLog: [],
    dayVotingEnabled: false,
    dayVote: null,
    revision,
    players: [
      {
        id: SESSION.playerId,
        name: 'Marc',
        isHost: true,
        connected: true,
        alive: true,
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
    lobby: createLobby(),
    destination: SESSION_DESTINATION.LOBBY,
  })
  enterResponse: Ack<LobbyEntryResponse> = ackSuccess({
    session: SESSION,
    lobby: createLobby(),
    destination: SESSION_DESTINATION.LOBBY,
  })
  readonly connect = vi.fn<() => Promise<void>>(async () => undefined)
  readonly reconnect = vi.fn<() => Promise<void>>(async () => undefined)
  readonly disconnect = vi.fn(() => undefined)
  readonly resume = vi.fn(async (_token: SessionToken) => this.resumeResponse)
  readonly enter = vi.fn(async (_name: string) => this.enterResponse)
  readonly listLobbies = vi.fn(async (): Promise<Ack<LobbyListResponse>> => ackSuccess([]))
  readonly createLobby = vi.fn(async (_name: string) => this.enterResponse)
  readonly joinLobby = vi.fn(async (_lobbyId: string, _name: string) => this.enterResponse)
  readonly leave = vi.fn(async (): Promise<Ack<EmptyResponse>> => ackSuccess({}))
  readonly kick = vi.fn(async (_id: PlayerId) => ackSuccess(createLobby(2)))
  readonly setDayVotingEnabled = vi.fn(async (_enabled: boolean, revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({ ...createLobby(revision + 1), dayVotingEnabled: _enabled }))
  readonly start = vi.fn(async (): Promise<Ack<GameStartPreview>> => ackSuccess({
    players: [],
    playerCount: 1,
    werewolfCount: 0,
    villagerTeamCount: 1,
  }))
  readonly confirmStart = vi.fn(async (): Promise<Ack<EmptyResponse>> => ackSuccess({}))
  readonly cancelStartPreview = vi.fn(async (): Promise<Ack<EmptyResponse>> => ackSuccess({}))
  readonly redistributeStartPreview = vi.fn(async (): Promise<Ack<GameStartPreview>> => ackSuccess({
    players: [],
    playerCount: 1,
    werewolfCount: 0,
    villagerTeamCount: 1,
  }))
  readonly proposeDayNomination = vi.fn(async (_targetPlayerId: string, revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({ ...createLobby(revision + 1), dayVote: null }))
  readonly approveDayNomination = vi.fn(async (_nominationId: string, revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({ ...createLobby(revision + 1), dayVote: null }))
  readonly startDayVote = vi.fn(async (_nominationId: string, revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({ ...createLobby(revision + 1), dayVote: null }))
  readonly rejectDayNomination = vi.fn(async (_nominationId: string, revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({ ...createLobby(revision + 1), dayVote: null }))
  readonly submitDayVote = vi.fn(async (_choice: DayVoteChoice, revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({ ...createLobby(revision + 1), dayVote: null }))
  readonly advanceGamePhase = vi.fn(async (revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({
    ...createLobby(revision + 1),
    phase: LOBBY_PHASE.STARTED,
    gamePhase: { period: 'day', number: 1 },
  }))
  readonly rewindGamePhase = vi.fn(async (revision: number): Promise<Ack<LobbySnapshot>> => ackSuccess({
    ...createLobby(revision + 1),
    phase: LOBBY_PHASE.STARTED,
    gamePhase: { period: 'night', number: 1 },
  }))
  readonly recordGameLogEvent = vi.fn(async (
    _eventType: GameLogEventType,
    _targetPlayerId: PlayerId,
    revision: number,
  ): Promise<Ack<LobbySnapshot>> => ackSuccess({
    ...createLobby(revision + 1),
    phase: LOBBY_PHASE.STARTED,
    gamePhase: { period: 'night', number: 1 },
    gameLog: [{
      id: 'game-event-1',
      eventType: 'night-kill',
      phase: { period: 'night', number: 1 },
      targetPlayerId: 'player_2',
      targetPlayerName: 'Joueur 2',
    }],
  }))
  readonly editGameLogEvent = vi.fn(async (
    _eventId: string,
    _targetPlayerId: PlayerId,
    revision: number,
  ): Promise<Ack<LobbySnapshot>> => ackSuccess({
    ...createLobby(revision + 1),
    phase: LOBBY_PHASE.STARTED,
    gamePhase: { period: 'night', number: 1 },
    gameLog: [{
      id: 'game-event-1',
      eventType: 'night-kill',
      phase: { period: 'night', number: 1 },
      targetPlayerId: 'player_3',
      targetPlayerName: 'Joueur 3',
    }],
  }))
  readonly deleteGameLogEvent = vi.fn(async (
    _eventId: string,
    revision: number,
  ): Promise<Ack<LobbySnapshot>> => ackSuccess({
    ...createLobby(revision + 1),
    phase: LOBBY_PHASE.STARTED,
    gamePhase: { period: 'night', number: 1 },
    gameLog: [],
  }))
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
    expect(gateway.resume).toHaveBeenCalledWith(SESSION.sessionToken, SESSION.lobbyId)
    expect(store.connectionState).toBe(CONNECTION_STATE.ONLINE)
    expect(store.lobby?.revision).toBe(1)
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
    expect(store.lobby).toBeNull()
    expect(storage.clear).toHaveBeenCalledOnce()
    store.dispose()
  })

  it('persists entry and ignores stale public snapshots', async () => {
    const gateway = new FakeGateway()
    gateway.enterResponse = ackSuccess({
      session: SESSION,
      lobby: createLobby(4),
      destination: SESSION_DESTINATION.LOBBY,
    })
    const storage = new FakeStorage()
    const store = createStore(gateway, storage)
    await store.initialize()

    expect(await store.enter(' Marc ')).toBe(true)
    expect(gateway.enter).toHaveBeenCalledWith('Marc')
    expect(storage.save).toHaveBeenCalledWith(SESSION)

    gateway.handlers?.onLobbySnapshot(createLobby(3))
    expect(store.lobby?.revision).toBe(4)
    store.dispose()
  })

  it('allows the MJ to toggle voting from the lobby', async () => {
    const gateway = new FakeGateway()
    const store = createStore(gateway, new FakeStorage(SESSION))
    await store.initialize()

    expect(await store.setDayVotingEnabled(true)).toBe(true)
    expect(gateway.setDayVotingEnabled).toHaveBeenCalledWith(true, 1)
    expect(store.lobby?.dayVotingEnabled).toBe(true)
    store.dispose()
  })

  it('advances the public phase through the MJ gateway action', async () => {
    const gateway = new FakeGateway()
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)
    await store.initialize()
    gateway.handlers?.onLobbySnapshot({
      ...createLobby(2),
      phase: LOBBY_PHASE.STARTED,
      gamePhase: { period: 'night', number: 1 },
      canStart: false,
    })

    expect(await store.advanceGamePhase()).toBe(true)
    expect(gateway.advanceGamePhase).toHaveBeenCalledWith(2)
    expect(store.lobby?.gamePhase).toEqual({ period: 'day', number: 1 })
    store.dispose()
  })

  it('records and corrects a public game log event through the gateway', async () => {
    const gateway = new FakeGateway()
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)
    await store.initialize()
    gateway.handlers?.onLobbySnapshot({
      ...createLobby(2),
      phase: LOBBY_PHASE.STARTED,
      gamePhase: { period: 'night', number: 1 },
      canStart: false,
    })

    expect(await store.recordGameLogEvent('night-kill', 'player_2')).toBe(true)
    expect(gateway.recordGameLogEvent).toHaveBeenCalledWith('night-kill', 'player_2', 2)
    expect(store.lobby?.gameLog[0]?.targetPlayerId).toBe('player_2')

    expect(await store.editGameLogEvent('game-event-1', 'player_3')).toBe(true)
    expect(gateway.editGameLogEvent).toHaveBeenCalledWith('game-event-1', 'player_3', 3)
    expect(store.lobby?.gameLog[0]?.targetPlayerId).toBe('player_3')
    store.dispose()
  })

  it('routes private events into separate player and MJ state', async () => {
    const gateway = new FakeGateway()
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)
    await store.initialize()

    gateway.handlers?.onDayVotePrivateStatus({ day: 1, nominationId: 'nomination-1', choice: 'yes' })
    expect(store.dayVotePrivateStatus?.choice).toBe('yes')

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
      roleAccessToken: 'role_00000000000000000000000000000000002',
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
      lobby: createLobby(),
      destination: SESSION_DESTINATION.LOBBY,
    }))
    await initializing

    expect(gateway.leave).toHaveBeenCalledOnce()
    expect(store.hasStoredSession).toBe(false)
    expect(store.lobby).toBeNull()
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

    gateway.handlers?.onLobbySnapshot({
      ...createLobby(2),
      phase: LOBBY_PHASE.STARTED,
      canStart: false,
    })
    await vi.advanceTimersByTimeAsync(
      CLIENT_TIMING.PRIVATE_VIEW_RECOVERY_DELAY_MS,
    )

    expect(gateway.reconnect).toHaveBeenCalledOnce()
    store.dispose()
  })


  it('does not construct or connect the gateway when simulator mode starts first', () => {
    const gateway = new FakeGateway()
    const getGateway = vi.fn(() => gateway)
    const useStore = createLobbyStoreDefinition(
      'lobby-simulator-isolation',
      { getGateway, storage: new FakeStorage() },
    )
    const store = useStore()

    store.suspendRealtime()

    expect(getGateway).not.toHaveBeenCalled()
    expect(gateway.connect).not.toHaveBeenCalled()
    expect(gateway.disconnect).not.toHaveBeenCalled()
    store.dispose()
  })


  it('invalidates an in-flight initialization while simulator mode is active', async () => {
    let resolveConnect: () => void = () => undefined
    const gateway = new FakeGateway()
    gateway.connect.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveConnect = resolve
    }))
    const storage = new FakeStorage(SESSION)
    const store = createStore(gateway, storage)

    const initializing = store.initialize()
    await Promise.resolve()
    store.suspendRealtime()
    resolveConnect()
    await initializing

    expect(gateway.disconnect).toHaveBeenCalled()
    expect(gateway.resume).not.toHaveBeenCalled()
    expect(storage.save).not.toHaveBeenCalled()

    await store.resumeRealtime()
    expect(gateway.resume).toHaveBeenCalledWith(SESSION.sessionToken, SESSION.lobbyId)
    expect(store.lobby).not.toBeNull()
    store.dispose()
  })

  it('cancels private-view recovery timers when realtime is suspended', async () => {
    vi.useFakeTimers()
    const gateway = new FakeGateway()
    const store = createStore(gateway, new FakeStorage(SESSION))
    await store.initialize()
    gateway.reconnect.mockClear()

    gateway.handlers?.onLobbySnapshot({
      ...createLobby(2),
      phase: LOBBY_PHASE.STARTED,
      canStart: false,
    })
    store.suspendRealtime()
    await vi.advanceTimersByTimeAsync(
      CLIENT_TIMING.PRIVATE_VIEW_RECOVERY_DELAY_MS,
    )

    expect(gateway.reconnect).not.toHaveBeenCalled()
    store.dispose()
  })

})
