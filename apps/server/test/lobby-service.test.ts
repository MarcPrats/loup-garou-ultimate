import { describe, expect, it } from 'vitest'

import {
  ERROR_CODE,
  ROOM_CLOSED_REASON,
  ROLE_ACCESS_VIEW,
  ROOM_PHASE,
  SESSION_DESTINATION,
} from '@lgu/contracts'
import { PLAYER_COUNT } from '@lgu/game-core'

import { LobbyService } from '../src/application/lobby-service'
import { LOBBY_TIME_LIMIT } from '../src/config/lobby-constants'
import { LobbyError } from '../src/domain/lobby-error'
import { InMemoryRoomRepository } from '../src/infrastructure/in-memory-room-repository'
import {
  DeterministicAssignmentGenerator,
  FakeClock,
  PlayerIdSequence,
  RoleAccessTokenSequence,
  SessionTokenSequence,
  ThrowingAssignmentGenerator,
} from './support/fakes'

function createFixture(
  assignmentGenerator = new DeterministicAssignmentGenerator(),
) {
  const clock = new FakeClock()
  const repository = new InMemoryRoomRepository()
  const service = new LobbyService({
    repository,
    clock,
    playerIdGenerator: new PlayerIdSequence(),
    sessionTokenGenerator: new SessionTokenSequence(),
    roleAccessTokenGenerator: new RoleAccessTokenSequence(),
    assignmentGenerator,
  })

  return { assignmentGenerator, clock, repository, service }
}

async function fillMinimumGame(service: LobbyService) {
  const host = await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
  const players = []
  for (let index = 1; index <= PLAYER_COUNT.MINIMUM; index += 1) {
    players.push(await service.enter({
      playerName: `Joueur ${index}`,
      connectionId: `player-${index}`,
    }))
  }
  return { host, players }
}

async function expectLobbyError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise
    throw new Error(`Expected LobbyError ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(LobbyError)
    expect(error).toMatchObject({ code })
  }
}

describe('LobbyService', () => {
  it('makes the first entrant host and keeps private session fields out of snapshots', async () => {
    const { repository, service } = createFixture()
    const host = await service.enter({
      playerName: 'Le MJ',
      connectionId: 'connection-host',
    })
    const player = await service.enter({
      playerName: 'Marc',
      connectionId: 'connection-player',
    })

    expect(host.destination).toBe(SESSION_DESTINATION.LOBBY)
    expect(host.room.players[0]).toMatchObject({
      id: host.session.playerId,
      name: 'Le MJ',
      isHost: true,
      connected: true,
    })
    expect(player.room.revision).toBe(2)
    expect(player.room.players[1]).toMatchObject({
      id: player.session.playerId,
      name: 'Marc',
      isHost: false,
    })
    expect(JSON.stringify(player.room)).not.toContain(player.session.sessionToken)
    expect(JSON.stringify(player.room)).not.toContain('connection-player')

    const internalRoom = await repository.read()
    expect(internalRoom?.players[1]?.sessionToken).toBe(player.session.sessionToken)
  })

  it('rejects duplicate names and serializes concurrent joins at capacity', async () => {
    const { service } = createFixture()
    await service.enter({ playerName: 'Le MJ', connectionId: 'host' })

    await expectLobbyError(
      service.enter({ playerName: ' le mj ', connectionId: 'duplicate' }),
      ERROR_CODE.INVALID_PLAYER_NAME,
    )

    const joins = Array.from(
      { length: PLAYER_COUNT.MAXIMUM + 5 },
      (_, index) => service.enter({
        playerName: `Joueur ${index + 1}`,
        connectionId: `connection-${index + 1}`,
      }),
    )
    const results = await Promise.allSettled(joins)

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(
      PLAYER_COUNT.MAXIMUM,
    )
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(5)

    const snapshot = await service.getRoomSnapshot()
    expect(snapshot?.players).toHaveLength(PLAYER_COUNT.MAXIMUM + 1)
  })

  it('marks disconnects, resumes sessions and ignores stale socket disconnects', async () => {
    const { service } = createFixture()
    await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
    const joined = await service.enter({
      playerName: 'Marc',
      connectionId: 'player-old',
    })

    const disconnected = await service.disconnect('player-old')
    expect(disconnected.changed).toBe(true)
    expect(disconnected.room?.revision).toBe(3)
    expect(disconnected.room?.players[1]?.connected).toBe(false)

    const resumed = await service.resume({
      sessionToken: joined.session.sessionToken,
      connectionId: 'player-new',
    })
    expect(resumed.replacedConnectionId).toBeNull()
    expect(resumed.response.room.revision).toBe(4)
    expect(resumed.response.room.players[1]?.connected).toBe(true)

    const replaced = await service.resume({
      sessionToken: joined.session.sessionToken,
      connectionId: 'player-newer',
    })
    expect(replaced.replacedConnectionId).toBe('player-new')
    expect(replaced.response.room.revision).toBe(4)

    const staleDisconnect = await service.disconnect('player-new')
    expect(staleDisconnect.changed).toBe(false)
  })

  it('starts only for the host with five connected regular players', async () => {
    const { service } = createFixture()
    const host = await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
    const players = []
    for (let index = 1; index <= PLAYER_COUNT.MINIMUM; index += 1) {
      players.push(await service.enter({
        playerName: `Joueur ${index}`,
        connectionId: `player-${index}`,
      }))
    }

    await expectLobbyError(
      service.start({
        sessionToken: players[0]!.session.sessionToken,
        connectionId: 'player-1',
      }),
      ERROR_CODE.NOT_GAME_MASTER,
    )

    await service.disconnect('player-5')
    await expectLobbyError(
      service.start({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
      }),
      ERROR_CODE.PLAYERS_DISCONNECTED,
    )

    await service.resume({
      sessionToken: players[4]!.session.sessionToken,
      connectionId: 'player-5-new',
    })
    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect(started.phase).toBe(ROOM_PHASE.STARTED)
    expect(started.canStart).toBe(false)
  })

  it('transfers host ownership when the host leaves the lobby', async () => {
    const { service } = createFixture()
    const host = await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
    const playerOne = await service.enter({ playerName: 'A', connectionId: 'a' })
    await service.enter({ playerName: 'B', connectionId: 'b' })

    const result = await service.leave({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect(result.room?.players.find((player) => player.id === playerOne.session.playerId)).toMatchObject({
      isHost: true,
    })
  })

  it('closes a started room when the host explicitly leaves', async () => {
    const { repository, service } = createFixture()
    const host = await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
    for (let index = 1; index <= PLAYER_COUNT.MINIMUM; index += 1) {
      await service.enter({
        playerName: `Joueur ${index}`,
        connectionId: `player-${index}`,
      })
    }
    await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    const result = await service.leave({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect(result.room?.phase).toBe(ROOM_PHASE.CLOSED)
    expect((await repository.read())?.closeReason).toBe(ROOM_CLOSED_REASON.HOST_LEFT)
  })

  it('allows only the host to kick players and only in the lobby', async () => {
    const { service } = createFixture()
    const host = await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
    const firstPlayer = await service.enter({ playerName: 'A', connectionId: 'a' })
    const secondPlayer = await service.enter({ playerName: 'B', connectionId: 'b' })

    await expectLobbyError(
      service.kick(
        {
          sessionToken: firstPlayer.session.sessionToken,
          connectionId: 'a',
        },
        secondPlayer.session.playerId,
      ),
      ERROR_CODE.NOT_GAME_MASTER,
    )

    const kicked = await service.kick(
      {
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
      },
      secondPlayer.session.playerId,
    )
    expect(kicked.playerId).toBe(secondPlayer.session.playerId)
    expect(kicked.room?.players).toHaveLength(2)
  })

  it('expires disconnected lobby sessions and transfers the host', async () => {
    const { clock, service } = createFixture()
    await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
    const player = await service.enter({ playerName: 'A', connectionId: 'a' })

    await service.disconnect('host')
    clock.advance(LOBBY_TIME_LIMIT.DISCONNECTED_SESSION_GRACE_MS)
    const cleanup = await service.cleanup()

    expect(cleanup.removedPlayerIds).toHaveLength(1)
    expect(cleanup.room?.players).toEqual([
      expect.objectContaining({
        id: player.session.playerId,
        isHost: true,
      }),
    ])
  })

  it('expires and later purges old rooms', async () => {
    const { clock, service } = createFixture()
    await service.enter({ playerName: 'Le MJ', connectionId: 'host' })

    clock.advance(LOBBY_TIME_LIMIT.ROOM_MAX_AGE_MS)
    const expired = await service.cleanup()
    expect(expired.roomExpired).toBe(true)
    expect(expired.room?.phase).toBe(ROOM_PHASE.CLOSED)

    clock.advance(LOBBY_TIME_LIMIT.CLOSED_ROOM_RETENTION_MS)
    const purged = await service.cleanup()
    expect(purged.roomPurged).toBe(true)
    expect(purged.room).toBeNull()
  })

  it('does not increment public revision for keep-alive messages', async () => {
    const { service } = createFixture()
    const host = await service.enter({ playerName: 'Le MJ', connectionId: 'host' })

    await service.keepAlive({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect((await service.getRoomSnapshot())?.revision).toBe(1)
  })

  it('persists one generated game and maps separate private and host views', async () => {
    const { assignmentGenerator, repository, service } = createFixture()
    const { host, players } = await fillMinimumGame(service)

    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })
    const internalRoom = await repository.read()
    const privateAssignment = await service.getPrivateAssignment({
      sessionToken: players[0]!.session.sessionToken,
      connectionId: 'player-1',
    })
    const dashboard = await service.getHostDashboard({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect(assignmentGenerator.calls).toBe(1)
    expect(internalRoom?.game?.assignment.assignments).toHaveLength(
      PLAYER_COUNT.MINIMUM,
    )
    expect(internalRoom?.game?.roleAccessGrants).toHaveLength(
      PLAYER_COUNT.MINIMUM + 1,
    )
    expect(JSON.stringify(started)).not.toContain('assignment')
    expect(JSON.stringify(started)).not.toContain('role_')
    expect(privateAssignment.player.id).toBe(players[0]!.session.playerId)
    expect(privateAssignment.roleAccessToken).toMatch(/^role_/)
    expect(privateAssignment).not.toHaveProperty('isDrunk')
    expect(privateAssignment).not.toHaveProperty('isVoyanteDecoy')
    expect(dashboard.players).toHaveLength(PLAYER_COUNT.MINIMUM)
    expect(dashboard.players.every((player) => 'isDrunk' in player)).toBe(true)
    expect(dashboard.players.every((player) => 'isVoyanteDecoy' in player)).toBe(true)
    await expectLobbyError(
      service.getHostDashboard({
        sessionToken: players[0]!.session.sessionToken,
        connectionId: 'player-1',
      }),
      ERROR_CODE.NOT_GAME_MASTER,
    )
    await expectLobbyError(
      service.getPrivateAssignment({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
      }),
      ERROR_CODE.PLAYER_NOT_FOUND,
    )
  })

  it('authorizes role links by audience without leaking player tokens to the host', async () => {
    const { repository, service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    const room = await repository.read()
    const hostGrant = room?.game?.roleAccessGrants.find(
      (grant) => grant.view === ROLE_ACCESS_VIEW.GAME_MASTER,
    )
    const playerGrant = room?.game?.roleAccessGrants.find(
      (grant) => grant.playerId === players[0]!.session.playerId,
    )
    expect(hostGrant).toBeDefined()
    expect(playerGrant).toBeDefined()

    const playerAccess = await service.accessRole(playerGrant!.token)
    const hostAccess = await service.accessRole(hostGrant!.token)

    expect(playerAccess.view).toBe(ROLE_ACCESS_VIEW.PLAYER)
    expect(hostAccess.view).toBe(ROLE_ACCESS_VIEW.GAME_MASTER)
    expect(JSON.stringify(hostAccess)).not.toContain('role_')
    await expectLobbyError(
      service.accessRole('invalid_role_token_that_is_long_enough_000000'),
      ERROR_CODE.INVALID_ROLE_TOKEN,
    )
  })

  it('keeps game generation atomic when assignment fails', async () => {
    const generator = new ThrowingAssignmentGenerator()
    const { repository, service } = createFixture(generator)
    const { host } = await fillMinimumGame(service)
    const beforeStart = await repository.read()

    await expect(
      service.start({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
      }),
    ).rejects.toThrow('Assignment generation failed')

    const afterFailure = await repository.read()
    expect(generator.calls).toBe(1)
    expect(afterFailure).toEqual(beforeStart)
    expect(afterFailure?.phase).toBe(ROOM_PHASE.LOBBY)
    expect(afterFailure?.game).toBeNull()
  })

  it('serializes concurrent starts and never regenerates an existing game', async () => {
    const { assignmentGenerator, repository, service } = createFixture()
    const { host } = await fillMinimumGame(service)
    const command = {
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    }

    const results = await Promise.allSettled([
      service.start(command),
      service.start(command),
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(assignmentGenerator.calls).toBe(1)
    expect((await repository.read())?.game).not.toBeNull()

    await expectLobbyError(service.start(command), ERROR_CODE.GAME_ALREADY_STARTED)
    expect(assignmentGenerator.calls).toBe(1)
  })

  it('returns the same private assignment after a post-start reconnect', async () => {
    const { assignmentGenerator, service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    const beforeReconnect = await service.getPrivateAssignment({
      sessionToken: players[0]!.session.sessionToken,
      connectionId: 'player-1',
    })
    await service.disconnect('player-1')
    const resumed = await service.resume({
      sessionToken: players[0]!.session.sessionToken,
      connectionId: 'player-1-new',
    })
    const afterReconnect = await service.getPrivateAssignment({
      sessionToken: players[0]!.session.sessionToken,
      connectionId: 'player-1-new',
    })

    expect(resumed.response.destination).toBe(SESSION_DESTINATION.PLAYER_ROLE)
    expect(afterReconnect).toEqual(beforeReconnect)
    expect(assignmentGenerator.calls).toBe(1)
  })
})
