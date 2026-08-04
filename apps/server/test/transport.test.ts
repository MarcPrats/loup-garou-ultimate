import { Server as SocketIoServer } from 'socket.io'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ERROR_CODE,
  PLAYER_COUNT_LIMIT,
  ROLE_ACCESS_VIEW,
  SESSION_ENDED_REASON,
  SOCKET_EVENT,
  type Ack,
  type ClientToServerEvents,
  type HostDashboard,
  type PrivateAssignment,
  type RoomClosedEvent,
  type RoomEntryResponse,
  type RoomSnapshot,
  type ServerToClientEvents,
  type SessionEndedEvent,
  type SessionResumeResponse,
} from '@lgu/contracts'

import { LobbyService } from '../src/application/lobby-service'
import { InMemoryRoomRepository } from '../src/infrastructure/in-memory-room-repository'
import { createHttpApp } from '../src/transport/http-app'
import { registerSocketHandlers } from '../src/transport/socket-handlers'
import type { GameSocketServer } from '../src/transport/socket-types'
import {
  DeterministicAssignmentGenerator,
  FakeClock,
  PlayerIdSequence,
  RoleAccessTokenSequence,
  SessionTokenSequence,
} from './support/fakes'

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>

interface TestRuntime {
  readonly app: ReturnType<typeof createHttpApp>
  readonly io: GameSocketServer
  readonly repository: InMemoryRoomRepository
  readonly service: LobbyService
  readonly url: string
}

const openClients: TestClient[] = []
const openRuntimes: TestRuntime[] = []

function createService(repository: InMemoryRoomRepository): LobbyService {
  return new LobbyService({
    repository,
    clock: new FakeClock(),
    playerIdGenerator: new PlayerIdSequence(),
    sessionTokenGenerator: new SessionTokenSequence(),
    roleAccessTokenGenerator: new RoleAccessTokenSequence(),
    assignmentGenerator: new DeterministicAssignmentGenerator(),
  })
}

async function createRuntime(): Promise<TestRuntime> {
  const repository = new InMemoryRoomRepository()
  const service = createService(repository)
  const app = createHttpApp({
    service,
    webOrigin: '*',
    logger: false,
  })
  const io: GameSocketServer = new SocketIoServer(app.server)
  registerSocketHandlers(io, service)
  const url = await app.listen({ host: '127.0.0.1', port: 0 })
  const runtime = { app, io, repository, service, url }
  openRuntimes.push(runtime)
  return runtime
}

async function connectClient(url: string): Promise<TestClient> {
  const client: TestClient = createClient(url, {
    forceNew: true,
    transports: ['websocket'],
  })
  openClients.push(client)
  if (client.connected) return client
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve)
    client.once('connect_error', reject)
  })
  return client
}

function enter(
  client: TestClient,
  playerName: string,
  clientRequestId?: string,
): Promise<Ack<RoomEntryResponse>> {
  return new Promise((resolve) => {
    client.emit(
      SOCKET_EVENT.ROOM_ENTER,
      clientRequestId ? { playerName, clientRequestId } : { playerName },
      resolve,
    )
  })
}

function resume(
  client: TestClient,
  sessionToken: string,
): Promise<Ack<SessionResumeResponse>> {
  return new Promise((resolve) => {
    client.emit(SOCKET_EVENT.SESSION_RESUME, { sessionToken }, resolve)
  })
}

function start(client: TestClient): Promise<Ack<Record<string, never>>> {
  return new Promise((resolve) => {
    client.emit(SOCKET_EVENT.GAME_START, {}, resolve)
  })
}

function leave(client: TestClient): Promise<Ack<Record<string, never>>> {
  return new Promise((resolve) => {
    client.emit(SOCKET_EVENT.PLAYER_LEAVE, {}, resolve)
  })
}

function kick(
  client: TestClient,
  playerId: string,
): Promise<Ack<RoomSnapshot>> {
  return new Promise((resolve) => {
    client.emit(SOCKET_EVENT.HOST_KICK, { playerId }, resolve)
  })
}

function onceEvent<T>(
  client: TestClient,
  event: string,
): Promise<T> {
  return new Promise((resolve) => {
    client.once(event as never, resolve as never)
  })
}

async function closeRuntime(runtime: TestRuntime): Promise<void> {
  await new Promise<void>((resolve) => runtime.io.close(() => resolve()))
  await runtime.app.close()
}

afterEach(async () => {
  for (const client of openClients.splice(0)) client.disconnect()
  for (const runtime of openRuntimes.splice(0)) await closeRuntime(runtime)
})

describe('V3 transport', () => {
  it('returns typed validation failures without mutating the room', async () => {
    const runtime = await createRuntime()
    const client = await connectClient(runtime.url)

    const response = await new Promise<Ack<RoomEntryResponse>>((resolve) => {
      client.emit(
        SOCKET_EVENT.ROOM_ENTER,
        { playerName: '' },
        resolve,
      )
    })

    expect(response).toEqual({
      ok: false,
      error: {
        code: ERROR_CODE.INVALID_PAYLOAD,
        message: 'La requête est invalide.',
      },
    })
    expect(await runtime.service.getRoomSnapshot()).toBeNull()
  })

  it('ignores mutating commands that omit the acknowledgement callback', async () => {
    const runtime = await createRuntime()
    const client = await connectClient(runtime.url)

    client.emit(SOCKET_EVENT.ROOM_ENTER, { playerName: 'Marc' })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(await runtime.service.getRoomSnapshot()).toBeNull()
  })

  it('coalesces concurrent room-entry retries while the first is in flight', async () => {
    const runtime = await createRuntime()
    const firstClient = await connectClient(runtime.url)
    const retryClient = await connectClient(runtime.url)
    const requestId = 'entry_request_00000000000000000002'
    const originalEnter = runtime.service.enter.bind(runtime.service)
    let releaseEntry: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      releaseEntry = resolve
    })
    vi.spyOn(runtime.service, 'enter').mockImplementation(async (command) => {
      await gate
      return originalEnter(command)
    })

    const first = enter(firstClient, 'Marc', requestId)
    await Promise.resolve()
    const retry = enter(retryClient, 'Marc', requestId)
    releaseEntry()
    const [firstResponse, retryResponse] = await Promise.all([first, retry])

    expect(firstResponse.ok).toBe(true)
    expect(retryResponse.ok).toBe(true)
    if (!firstResponse.ok || !retryResponse.ok) return
    expect(retryResponse.data.session).toEqual(firstResponse.data.session)
    expect((await runtime.service.getRoomSnapshot())?.players).toHaveLength(1)
  })

  it('recovers an acknowledged entry retry without creating a ghost player', async () => {
    const runtime = await createRuntime()
    const requestId = 'entry_request_00000000000000000001'
    const firstClient = await connectClient(runtime.url)
    const first = await enter(firstClient, 'Marc', requestId)
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const sameSocketRetry = await enter(firstClient, 'Marc', requestId)
    expect(sameSocketRetry).toEqual(first)
    expect((await runtime.service.getRoomSnapshot())?.players).toHaveLength(1)

    firstClient.disconnect()
    await new Promise((resolve) => setTimeout(resolve, 10))
    const recoveredClient = await connectClient(runtime.url)
    const recovered = await enter(recoveredClient, 'Marc', requestId)

    expect(recovered.ok).toBe(true)
    if (!recovered.ok) return
    expect(recovered.data.session).toEqual(first.data.session)
    expect(recovered.data.room.players).toHaveLength(1)
    expect(recovered.data.room.players[0]?.connected).toBe(true)
  })

  it('binds at most one active session to each socket', async () => {
    const runtime = await createRuntime()
    const host = await connectClient(runtime.url)
    const player = await connectClient(runtime.url)
    const hostEntry = await enter(host, 'Le MJ')
    const playerEntry = await enter(player, 'Marc')
    expect(hostEntry.ok && playerEntry.ok).toBe(true)
    if (!hostEntry.ok || !playerEntry.ok) return

    const repeatedEnter = await enter(host, 'Deuxième identité')
    const crossSessionResume = await resume(
      host,
      playerEntry.data.session.sessionToken,
    )

    expect(repeatedEnter).toMatchObject({
      ok: false,
      error: { code: ERROR_CODE.INVALID_PAYLOAD },
    })
    expect(crossSessionResume).toMatchObject({
      ok: false,
      error: { code: ERROR_CODE.INVALID_PAYLOAD },
    })
    expect((await runtime.service.getRoomSnapshot())?.players).toHaveLength(2)
  })

  it('replaces an active socket without changing the public revision', async () => {
    const runtime = await createRuntime()
    const oldClient = await connectClient(runtime.url)
    const entered = await enter(oldClient, 'Marc')
    expect(entered.ok).toBe(true)
    if (!entered.ok) return

    const disconnected = onceEvent<void>(oldClient, 'disconnect')
    const newClient = await connectClient(runtime.url)
    const resumed = await resume(
      newClient,
      entered.data.session.sessionToken,
    )

    expect(resumed.ok).toBe(true)
    if (!resumed.ok) return
    expect(resumed.data.room.revision).toBe(entered.data.room.revision)
    await disconnected
    expect(oldClient.connected).toBe(false)
    expect((await runtime.service.getRoomSnapshot())?.players[0]?.connected).toBe(true)
  })

  it('targets each private assignment and the host dashboard to one socket', async () => {
    const runtime = await createRuntime()
    const host = await connectClient(runtime.url)
    const hostEntry = await enter(host, 'Le MJ')
    expect(hostEntry.ok).toBe(true)

    const players: Array<{
      client: TestClient
      entry: RoomEntryResponse
      assignments: PrivateAssignment[]
      dashboards: HostDashboard[]
    }> = []
    for (let index = 1; index <= PLAYER_COUNT_LIMIT.MINIMUM; index += 1) {
      const client = await connectClient(runtime.url)
      const response = await enter(client, `Joueur ${index}`)
      expect(response.ok).toBe(true)
      if (!response.ok) continue
      const assignments: PrivateAssignment[] = []
      const dashboards: HostDashboard[] = []
      client.on(SOCKET_EVENT.PRIVATE_ASSIGNMENT, (value) => assignments.push(value))
      client.on(SOCKET_EVENT.HOST_DASHBOARD, (value) => dashboards.push(value))
      players.push({ client, entry: response.data, assignments, dashboards })
    }

    const hostAssignments: PrivateAssignment[] = []
    const hostDashboards: HostDashboard[] = []
    const publicSnapshots: RoomSnapshot[] = []
    host.on(SOCKET_EVENT.PRIVATE_ASSIGNMENT, (value) => hostAssignments.push(value))
    host.on(SOCKET_EVENT.HOST_DASHBOARD, (value) => hostDashboards.push(value))
    host.on(SOCKET_EVENT.ROOM_SNAPSHOT, (value) => publicSnapshots.push(value))

    const started = await start(host)
    expect(started).toEqual({ ok: true, data: {} })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(hostAssignments).toHaveLength(0)
    expect(hostDashboards).toHaveLength(1)
    expect(players).toHaveLength(PLAYER_COUNT_LIMIT.MINIMUM)
    for (const player of players) {
      expect(player.assignments).toHaveLength(1)
      expect(player.assignments[0]?.player.id).toBe(player.entry.session.playerId)
      expect(player.dashboards).toHaveLength(0)
    }
    expect(publicSnapshots.length).toBeGreaterThan(0)
    expect(JSON.stringify(publicSnapshots.at(-1))).not.toContain('roleAccessToken')
    expect(JSON.stringify(publicSnapshots.at(-1))).not.toContain('isDrunk')
  })

  it('notifies and disconnects a kicked player before broadcasting the snapshot', async () => {
    const runtime = await createRuntime()
    const host = await connectClient(runtime.url)
    const target = await connectClient(runtime.url)
    const hostEntry = await enter(host, 'Le MJ')
    const targetEntry = await enter(target, 'Cible')
    expect(hostEntry.ok && targetEntry.ok).toBe(true)
    if (!hostEntry.ok || !targetEntry.ok) return

    const ended = onceEvent<SessionEndedEvent>(target, SOCKET_EVENT.SESSION_ENDED)
    const disconnected = onceEvent<void>(target, 'disconnect')
    const response = await kick(host, targetEntry.data.session.playerId)

    expect(response.ok).toBe(true)
    expect(await ended).toMatchObject({ reason: SESSION_ENDED_REASON.KICKED })
    await disconnected
    expect(response.ok && response.data.players).toHaveLength(1)
  })

  it('disconnects remaining participants when the started room closes', async () => {
    const runtime = await createRuntime()
    const host = await connectClient(runtime.url)
    const hostEntry = await enter(host, 'Le MJ')
    expect(hostEntry.ok).toBe(true)

    const players: TestClient[] = []
    for (let index = 1; index <= PLAYER_COUNT_LIMIT.MINIMUM; index += 1) {
      const player = await connectClient(runtime.url)
      expect((await enter(player, `Joueur ${index}`)).ok).toBe(true)
      players.push(player)
    }
    expect((await start(host)).ok).toBe(true)

    const roomClosed = onceEvent<RoomClosedEvent>(
      players[0]!,
      SOCKET_EVENT.ROOM_CLOSED,
    )
    const disconnected = players.map((player) =>
      onceEvent<void>(player, 'disconnect'),
    )
    expect((await leave(host)).ok).toBe(true)

    expect(await roomClosed).toMatchObject({
      reason: 'host-left',
    })
    await Promise.all(disconnected)
    expect(players.every((player) => !player.connected)).toBe(true)
  })

  it('serves player and game-master role links with uniform invalid-token errors', async () => {
    const runtime = await createRuntime()
    const host = await connectClient(runtime.url)
    const hostEntry = await enter(host, 'Le MJ')
    expect(hostEntry.ok).toBe(true)

    const playerClients: TestClient[] = []
    let firstAssignment: PrivateAssignment | null = null
    for (let index = 1; index <= PLAYER_COUNT_LIMIT.MINIMUM; index += 1) {
      const client = await connectClient(runtime.url)
      const response = await enter(client, `Joueur ${index}`)
      expect(response.ok).toBe(true)
      playerClients.push(client)
      if (index === 1) {
        client.once(SOCKET_EVENT.PRIVATE_ASSIGNMENT, (assignment) => {
          firstAssignment = assignment
        })
      }
    }

    await start(host)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(firstAssignment).not.toBeNull()

    const playerResponse = await runtime.app.inject({
      method: 'GET',
      url: `/api/role/${firstAssignment!.roleAccessToken}`,
    })
    expect(playerResponse.statusCode).toBe(200)
    expect(playerResponse.headers['cache-control']).toBe('no-store')
    expect(playerResponse.headers['referrer-policy']).toBe('no-referrer')
    expect(playerResponse.json()).toMatchObject({ view: ROLE_ACCESS_VIEW.PLAYER })

    const room = await runtime.repository.read()
    const hostToken = room?.game?.roleAccessGrants.find(
      (grant) => grant.view === ROLE_ACCESS_VIEW.GAME_MASTER,
    )?.token
    expect(hostToken).toBeDefined()
    const hostResponse = await runtime.app.inject({
      method: 'GET',
      url: `/api/role/${hostToken}`,
    })
    expect(hostResponse.statusCode).toBe(200)
    expect(hostResponse.json()).toMatchObject({
      view: ROLE_ACCESS_VIEW.GAME_MASTER,
    })
    expect(hostResponse.json().dashboard.roleAccessToken).toBe(hostToken)

    const invalidResponse = await runtime.app.inject({
      method: 'GET',
      url: '/api/role/not-valid',
    })
    expect(invalidResponse.statusCode).toBe(404)
    expect(invalidResponse.json()).toMatchObject({
      code: ERROR_CODE.INVALID_ROLE_TOKEN,
    })
  })
})
