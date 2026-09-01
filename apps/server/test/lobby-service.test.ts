import { describe, expect, it } from 'vitest'

import {
  ERROR_CODE,
  DAY_VOTE_CHOICE,
  type DayVoteChoice,
  GAME_LOG_EVENT_TYPE,
  LOBBY_CLOSED_REASON,
  ROLE_ACCESS_VIEW,
  LOBBY_PHASE,
  SESSION_DESTINATION,
} from '@lgu/contracts'
import { PLAYER_COUNT } from '@lgu/game-core'

import { LobbyService } from '../src/application/lobby-service'
import { LOBBY_TIME_LIMIT } from '../src/config/lobby-constants'
import { LobbyError } from '../src/domain/lobby-error'
import { InMemoryLobbyRepository } from '../src/infrastructure/in-memory-lobby-repository'
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
  const repository = new InMemoryLobbyRepository()
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
    expect(host.lobby.players[0]).toMatchObject({
      id: host.session.playerId,
      name: 'Le MJ',
      isHost: true,
      connected: true,
    })
    expect(player.lobby.revision).toBe(2)
    expect(player.lobby.players[1]).toMatchObject({
      id: player.session.playerId,
      name: 'Marc',
      isHost: false,
    })
    expect(JSON.stringify(player.lobby)).not.toContain(player.session.sessionToken)
    expect(JSON.stringify(player.lobby)).not.toContain('connection-player')

    const internalLobby = await repository.read()
    expect(internalLobby?.players[1]?.sessionToken).toBe(player.session.sessionToken)
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

    const snapshot = await service.getLobbySnapshot()
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
    expect(disconnected.lobby?.revision).toBe(3)
    expect(disconnected.lobby?.players[1]?.connected).toBe(false)

    const resumed = await service.resume({
      sessionToken: joined.session.sessionToken,
      connectionId: 'player-new',
    })
    expect(resumed.replacedConnectionId).toBeNull()
    expect(resumed.publicStateChanged).toBe(true)
    expect(resumed.response.lobby.revision).toBe(4)
    expect(resumed.response.lobby.players[1]?.connected).toBe(true)

    const replaced = await service.resume({
      sessionToken: joined.session.sessionToken,
      connectionId: 'player-newer',
    })
    expect(replaced.replacedConnectionId).toBe('player-new')
    expect(replaced.publicStateChanged).toBe(false)
    expect(replaced.response.lobby.revision).toBe(4)

    const staleDisconnect = await service.disconnect('player-new')
    expect(staleDisconnect.changed).toBe(false)
  })

  it('prevents two active sessions from sharing one connection ID', async () => {
    const { service } = createFixture()
    await service.enter({ playerName: 'Le MJ', connectionId: 'shared' })
    const player = await service.enter({
      playerName: 'Marc',
      connectionId: 'player',
    })

    await expectLobbyError(
      service.enter({ playerName: 'Intrus', connectionId: 'shared' }),
      ERROR_CODE.INVALID_PAYLOAD,
    )
    await expectLobbyError(
      service.resume({
        sessionToken: player.session.sessionToken,
        connectionId: 'shared',
      }),
      ERROR_CODE.INVALID_PAYLOAD,
    )
    expect((await service.getLobbySnapshot())?.players).toHaveLength(2)
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

    expect(started.lobby.phase).toBe(LOBBY_PHASE.STARTED)
    expect(started.lobby.gamePhase).toEqual({ period: 'night', number: 1 })
    expect(started.lobby.canStart).toBe(false)
    expect(started.privateAssignments).toHaveLength(PLAYER_COUNT.MINIMUM)
    expect(started.hostDashboard.connectionId).toBe('host')
  })

  it('previews, redistributes, cancels, and confirms one exact role assignment', async () => {
    const { repository, service } = createFixture()
    const { host } = await fillMinimumGame(service)
    const command = {
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    }

    const preview = await service.prepareStartPreview(command)
    expect(preview.lobby.phase).toBe(LOBBY_PHASE.LOBBY)
    expect(preview.preview.players).toHaveLength(PLAYER_COUNT.MINIMUM)
    expect((await repository.read())?.game).toBeNull()

    const redistributed = await service.redistributeStartPreview(command)
    expect(redistributed.preview.players).toHaveLength(PLAYER_COUNT.MINIMUM)

    await service.cancelStartPreview(command)
    expect((await repository.read())?.gameStartPreview).toBeNull()

    const confirmedPreview = await service.prepareStartPreview(command)
    const started = await service.start(command)
    expect(started.lobby.phase).toBe(LOBBY_PHASE.STARTED)
    expect(started.lobby.gamePhase).toEqual({ period: 'night', number: 1 })
    expect(new Map(
      confirmedPreview.preview.players.map((player) => [player.player.id, player.role.id]),
    )).toEqual(new Map(
      started.privateAssignments.map((delivery) => [delivery.assignment.player.id, delivery.assignment.role.id]),
    ))
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

    expect(result.lobby?.players.find((player) => player.id === playerOne.session.playerId)).toMatchObject({
      isHost: true,
    })
  })

  it('closes a started lobby when the host explicitly leaves', async () => {
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

    expect(result.lobby?.phase).toBe(LOBBY_PHASE.CLOSED)
    expect(result.lobbyClosedReason).toBe(LOBBY_CLOSED_REASON.HOST_LEFT)
    expect((await repository.read())?.closeReason).toBe(LOBBY_CLOSED_REASON.HOST_LEFT)
  })

  it('keeps a revoked player as a disconnected game tombstone', async () => {
    const { repository, service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })
    const privateAssignment = await service.getPrivateAssignment({
      sessionToken: players[0]!.session.sessionToken,
      connectionId: 'player-1',
    })

    const result = await service.leave({
      sessionToken: players[0]!.session.sessionToken,
      connectionId: 'player-1',
    })
    const dashboard = await service.getHostDashboard({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect(result.lobby?.players).toHaveLength(PLAYER_COUNT.MINIMUM + 1)
    expect(result.lobby?.players.find(
      (player) => player.id === players[0]!.session.playerId,
    )?.connected).toBe(false)
    expect(dashboard.players).toHaveLength(PLAYER_COUNT.MINIMUM)
    const internalLobby = await repository.read()
    expect(internalLobby?.players.find(
      (player) => player.id === players[0]!.session.playerId,
    )?.sessionRevoked).toBe(true)
    expect(internalLobby?.game?.roleAccessGrants.some(
      (grant) => grant.playerId === players[0]!.session.playerId,
    )).toBe(false)
    await expectLobbyError(
      service.accessRole(privateAssignment.roleAccessToken),
      ERROR_CODE.INVALID_ROLE_TOKEN,
    )
    await expectLobbyError(
      service.resume({
        sessionToken: players[0]!.session.sessionToken,
        connectionId: 'player-return',
      }),
      ERROR_CODE.SESSION_NOT_FOUND,
    )
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
    expect(kicked.lobby?.players).toHaveLength(2)
  })

  it('expires disconnected lobby sessions and transfers the host', async () => {
    const { clock, service } = createFixture()
    await service.enter({ playerName: 'Le MJ', connectionId: 'host' })
    const player = await service.enter({ playerName: 'A', connectionId: 'a' })

    await service.disconnect('host')
    clock.advance(LOBBY_TIME_LIMIT.DISCONNECTED_SESSION_GRACE_MS)
    const cleanup = await service.cleanup()

    expect(cleanup.removedPlayerIds).toHaveLength(1)
    expect(cleanup.lobby?.players).toEqual([
      expect.objectContaining({
        id: player.session.playerId,
        isHost: true,
      }),
    ])
  })

  it('expires and later purges old lobbys', async () => {
    const { clock, service } = createFixture()
    await service.enter({ playerName: 'Le MJ', connectionId: 'host' })

    clock.advance(LOBBY_TIME_LIMIT.LOBBY_MAX_AGE_MS)
    const expired = await service.cleanup()
    expect(expired.lobbyExpired).toBe(true)
    expect(expired.lobby?.phase).toBe(LOBBY_PHASE.CLOSED)

    clock.advance(LOBBY_TIME_LIMIT.CLOSED_LOBBY_RETENTION_MS)
    const purged = await service.cleanup()
    expect(purged.lobbyPurged).toBe(true)
    expect(purged.lobby).toBeNull()
  })

  it('does not increment public revision for keep-alive messages', async () => {
    const { service } = createFixture()
    const host = await service.enter({ playerName: 'Le MJ', connectionId: 'host' })

    await service.keepAlive({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect((await service.getLobbySnapshot())?.revision).toBe(1)
  })

  it('persists one generated game and maps separate private and host views', async () => {
    const { assignmentGenerator, repository, service } = createFixture()
    const { host, players } = await fillMinimumGame(service)

    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })
    const internalLobby = await repository.read()
    const privateAssignment = await service.getPrivateAssignment({
      sessionToken: players[0]!.session.sessionToken,
      connectionId: 'player-1',
    })
    const dashboard = await service.getHostDashboard({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    expect(assignmentGenerator.calls).toBe(1)
    expect(internalLobby?.game?.assignment.assignments).toHaveLength(
      PLAYER_COUNT.MINIMUM,
    )
    expect(internalLobby?.game?.roleAccessGrants).toHaveLength(
      PLAYER_COUNT.MINIMUM + 1,
    )
    expect(JSON.stringify(started.lobby)).not.toContain('assignment')
    expect(JSON.stringify(started.lobby)).not.toContain('role_')
    expect(started.privateAssignments).toHaveLength(PLAYER_COUNT.MINIMUM)
    expect(started.hostDashboard.dashboard).toEqual(dashboard)
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

  it('advances the public game phase in order and requires the current host revision', async () => {
    const { service } = createFixture()
    const { host } = await fillMinimumGame(service)
    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    const day = await service.advanceGamePhase({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: started.lobby.revision,
    })
    expect(day.gamePhase).toEqual({ period: 'day', number: 1 })

    const night = await service.advanceGamePhase({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: day.revision,
    })
    expect(night.gamePhase).toEqual({ period: 'night', number: 2 })

    await expectLobbyError(
      service.advanceGamePhase({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
        expectedRevision: day.revision,
      }),
      ERROR_CODE.STALE_REVISION,
    )

    await service.disconnect('host')
    const resumed = await service.resume({
      sessionToken: host.session.sessionToken,
      connectionId: 'host-reconnected',
    })
    expect(resumed.response.lobby.gamePhase).toEqual({ period: 'night', number: 2 })
  })

  it('rejects phase changes from a regular player', async () => {
    const { service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    await expectLobbyError(
      service.advanceGamePhase({
        sessionToken: players[0]!.session.sessionToken,
        connectionId: 'player-1',
        expectedRevision: started.lobby.revision,
      }),
      ERROR_CODE.NOT_GAME_MASTER,
    )
  })

  it('lets the host configure voting and keeps it disabled by default', async () => {
    const { service } = createFixture()
    const { host, players } = await fillMinimumGame(service)

    expect(host.lobby.dayVotingEnabled).toBe(false)
    const enabled = await service.setDayVotingEnabled({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: players[players.length - 1]!.lobby.revision,
      enabled: true,
    })
    expect(enabled.dayVotingEnabled).toBe(true)

    await expectLobbyError(
      service.setDayVotingEnabled({
        sessionToken: players[0]!.session.sessionToken,
        connectionId: 'player-1',
        expectedRevision: enabled.revision,
        enabled: false,
      }),
      ERROR_CODE.NOT_GAME_MASTER,
    )

    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })
    await expectLobbyError(
      service.setDayVotingEnabled({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
        expectedRevision: started.lobby.revision,
        enabled: false,
      }),
      ERROR_CODE.GAME_ALREADY_STARTED,
    )
  })

  it('rejects voting commands when the lobby option is disabled', async () => {
    const { service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })
    const day = await service.advanceGamePhase({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: started.lobby.revision,
    })

    await expectLobbyError(
      service.proposeDayNomination({
        sessionToken: players[0]!.session.sessionToken,
        connectionId: 'player-1',
        expectedRevision: day.revision,
        targetPlayerId: players[1]!.session.playerId,
      }),
      ERROR_CODE.INVALID_GAME_EVENT,
    )
    expect(day.dayVote).toBeNull()
  })

  it('supports several vote rounds and selects the unique highest majority without eliminating automatically', async () => {
    const { service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    const enabled = await service.setDayVotingEnabled({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: players[players.length - 1]!.lobby.revision,
      enabled: true,
    })
    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })
    const day = await service.advanceGamePhase({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: started.lobby.revision,
    })

    const runRound = async (
      snapshot: typeof day,
      nominatorIndex: number,
      targetIndex: number,
      choices: readonly DayVoteChoice[],
    ) => {
      let next = await service.proposeDayNomination({
        sessionToken: players[nominatorIndex]!.session.sessionToken,
        connectionId: `player-${nominatorIndex + 1}`,
        expectedRevision: snapshot.revision,
        targetPlayerId: players[targetIndex]!.session.playerId,
      })
      next = await service.approveDayNomination({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
        expectedRevision: next.revision,
        nominationId: next.dayVote!.nomination!.id,
      })
      next = await service.startDayVote({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
        expectedRevision: next.revision,
        nominationId: next.dayVote!.nomination!.id,
      })
      for (let index = 0; index < players.length; index += 1) {
        next = await service.submitDayVote({
          sessionToken: players[index]!.session.sessionToken,
          connectionId: `player-${index + 1}`,
          expectedRevision: next.revision,
          choice: choices[index]!,
        })
      }
      return next
    }

    const firstRound = await runRound(day, 0, 1, [
      DAY_VOTE_CHOICE.YES,
      DAY_VOTE_CHOICE.YES,
      DAY_VOTE_CHOICE.YES,
      DAY_VOTE_CHOICE.NO,
      DAY_VOTE_CHOICE.NO,
    ])
    expect(firstRound.dayVote?.dailyResult).toMatchObject({
      status: 'winner',
      targetId: players[1]!.session.playerId,
      yesCount: 3,
    })

    const secondRound = await runRound(firstRound, 2, 3, [
      DAY_VOTE_CHOICE.YES,
      DAY_VOTE_CHOICE.YES,
      DAY_VOTE_CHOICE.YES,
      DAY_VOTE_CHOICE.YES,
      DAY_VOTE_CHOICE.NO,
    ])
    expect(secondRound.dayVote?.completedRounds).toHaveLength(2)
    expect(secondRound.dayVote?.dailyResult).toMatchObject({
      status: 'winner',
      targetId: players[3]!.session.playerId,
      yesCount: 4,
    })
    expect(secondRound.players.find((player) => player.id === players[3]!.session.playerId)?.alive).toBe(true)
    expect(secondRound.gameLog.filter((entry) => entry.eventType === 'day-vote')).toHaveLength(2)

    const execution = await service.recordGameLogEvent({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: secondRound.revision,
      eventType: 'day-execution',
      targetPlayerId: players[3]!.session.playerId,
    })
    expect(execution.players.find((player) => player.id === players[3]!.session.playerId)?.alive).toBe(false)
    expect(enabled.dayVotingEnabled).toBe(true)
  })

  it('records, publishes, and corrects night kills and daytime executions', async () => {
    const { service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    const started = await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })
    const firstPlayerId = players[0]!.session.playerId
    const secondPlayerId = players[1]!.session.playerId
    const thirdPlayerId = players[2]!.session.playerId

    const nightKill = await service.recordGameLogEvent({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: started.lobby.revision,
      eventType: GAME_LOG_EVENT_TYPE.NIGHT_KILL,
      targetPlayerId: firstPlayerId,
    })
    expect(nightKill.gameLog[0]).toMatchObject({
      eventType: GAME_LOG_EVENT_TYPE.NIGHT_KILL,
      targetPlayerId: firstPlayerId,
      targetPlayerName: 'Joueur 1',
      phase: { period: 'night', number: 1 },
    })
    expect(nightKill.players.find((player) => player.id === firstPlayerId)?.alive).toBe(false)

    await expectLobbyError(
      service.recordGameLogEvent({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
        expectedRevision: nightKill.revision,
        eventType: GAME_LOG_EVENT_TYPE.DAY_EXECUTION,
        targetPlayerId: secondPlayerId,
      }),
      ERROR_CODE.INVALID_GAME_EVENT,
    )

    const day = await service.advanceGamePhase({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: nightKill.revision,
    })
    const execution = await service.recordGameLogEvent({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: day.revision,
      eventType: GAME_LOG_EVENT_TYPE.DAY_EXECUTION,
      targetPlayerId: secondPlayerId,
    })
    const executionId = execution.gameLog[1]!.id
    expect(execution.players.find((player) => player.id === secondPlayerId)?.alive).toBe(false)

    const corrected = await service.editGameLogEvent({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
      expectedRevision: execution.revision,
      eventId: executionId,
      targetPlayerId: thirdPlayerId,
    })
    expect(corrected.gameLog[1]).toMatchObject({
      id: executionId,
      targetPlayerId: thirdPlayerId,
      targetPlayerName: 'Joueur 3',
    })
    expect(corrected.players.find((player) => player.id === secondPlayerId)?.alive).toBe(true)
    expect(corrected.players.find((player) => player.id === thirdPlayerId)?.alive).toBe(false)

    await expectLobbyError(
      service.recordGameLogEvent({
        sessionToken: host.session.sessionToken,
        connectionId: 'host',
        expectedRevision: corrected.revision,
        eventType: GAME_LOG_EVENT_TYPE.DAY_EXECUTION,
        targetPlayerId: firstPlayerId,
      }),
      ERROR_CODE.PLAYER_ALREADY_DEAD,
    )
  })

  it('authorizes role links by audience without leaking player tokens to the host', async () => {
    const { repository, service } = createFixture()
    const { host, players } = await fillMinimumGame(service)
    await service.start({
      sessionToken: host.session.sessionToken,
      connectionId: 'host',
    })

    const lobby = await repository.read()
    const hostGrant = lobby?.game?.roleAccessGrants.find(
      (grant) => grant.view === ROLE_ACCESS_VIEW.GAME_MASTER,
    )
    const playerGrant = lobby?.game?.roleAccessGrants.find(
      (grant) => grant.playerId === players[0]!.session.playerId,
    )
    expect(hostGrant).toBeDefined()
    expect(playerGrant).toBeDefined()

    const playerAccess = await service.accessRole(playerGrant!.token)
    const hostAccess = await service.accessRole(hostGrant!.token)

    expect(playerAccess.view).toBe(ROLE_ACCESS_VIEW.PLAYER)
    expect(hostAccess.view).toBe(ROLE_ACCESS_VIEW.GAME_MASTER)
    if (hostAccess.view === ROLE_ACCESS_VIEW.GAME_MASTER) {
      expect(hostAccess.dashboard.roleAccessToken).toMatch(/^role_/)
    }
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
    expect(afterFailure?.phase).toBe(LOBBY_PHASE.LOBBY)
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
