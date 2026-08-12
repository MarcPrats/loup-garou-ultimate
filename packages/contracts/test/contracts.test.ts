import { describe, expect, it } from 'vitest'

import {
  APPLICATION,
  ERROR_CODE,
  GAME_LOG_EVENT_TYPE,
  PLAYER_COUNT_LIMIT,
  ROLE_CATEGORY,
  LOBBY_ID,
  LOBBY_PHASE,
  SESSION_DESTINATION,
  SOCKET_EVENT,
  TEAM,
  ackFailure,
  ackSuccess,
  createAckSchema,
  createInitialGamePhase,
  getNextGamePhase,
  gameLogEditCommandSchema,
  gameLogEntrySchema,
  gameLogRecordCommandSchema,
  healthResponseSchema,
  hostDashboardSchema,
  hostPlayerAssignmentSchema,
  privateAssignmentSchema,
  publicErrorSchema,
  lobbyEntryResponseSchema,
  lobbyEnterCommandSchema,
  lobbySnapshotSchema,
  simulatorCreateCommandSchema,
} from '../src'

const token = 'a'.repeat(32)

const player = {
  id: 'player-1',
  name: 'Marc',
}

const role = {
  id: 'voyante',
  team: TEAM.VILLAGERS,
  category: ROLE_CATEGORY.VILLAGER,
}

const privateAssignment = {
  player,
  role,
  roleAccessToken: token,
  bluffRoleId: null,
  specialInformation: null,
}

describe('HTTP contracts', () => {
  it('validates the health response', () => {
    expect(healthResponseSchema.parse({
      app: APPLICATION.ID,
      version: APPLICATION.VERSION,
      status: 'ok',
    })).toEqual({
      app: APPLICATION.ID,
      version: APPLICATION.VERSION,
      status: 'ok',
    })
  })
})

describe('game log contracts', () => {
  it('accepts a public night kill and validates its command', () => {
    const entry = gameLogEntrySchema.parse({
      id: 'game-event-1',
      eventType: GAME_LOG_EVENT_TYPE.NIGHT_KILL,
      phase: { period: 'night', number: 1 },
      targetPlayerId: 'player-1',
      targetPlayerName: 'Marc',
    })
    expect(entry.targetPlayerName).toBe('Marc')
    expect(gameLogRecordCommandSchema.safeParse({
      expectedRevision: 4,
      eventType: GAME_LOG_EVENT_TYPE.NIGHT_KILL,
      targetPlayerId: 'player-1',
    }).success).toBe(true)
    expect(gameLogEditCommandSchema.safeParse({
      expectedRevision: 4,
      eventId: 'game-event-1',
      targetPlayerId: 'player-2',
    }).success).toBe(true)
  })
})

describe('command contracts', () => {
  it('trims and validates player names', () => {
    expect(lobbyEnterCommandSchema.parse({ playerName: '  Marc  ' })).toEqual({
      playerName: 'Marc',
    })
    expect(lobbyEnterCommandSchema.safeParse({ playerName: '' }).success).toBe(false)
    expect(lobbyEnterCommandSchema.safeParse({
      playerName: 'Marc',
      clientRequestId: 'entry_request_00000000000000000001',
    }).success).toBe(true)
    expect(lobbyEnterCommandSchema.safeParse({
      playerName: 'Marc',
      clientRequestId: 'short',
    }).success).toBe(false)
    expect(lobbyEnterCommandSchema.safeParse({ playerName: 'Marc', isHost: true }).success).toBe(false)
  })
})

describe('privacy boundaries', () => {
  it('rejects MJ-only fields in a private player assignment', () => {
    expect(privateAssignmentSchema.safeParse({
      ...privateAssignment,
      isDrunk: true,
    }).success).toBe(false)
  })

  it('requires a private role-access token in the MJ dashboard', () => {
    expect(hostDashboardSchema.safeParse({
      players: [],
      playerCount: 1,
      werewolfCount: 0,
      villagerTeamCount: 1,
    }).success).toBe(false)
    expect(hostDashboardSchema.safeParse({
      roleAccessToken: token,
      players: [],
      playerCount: 1,
      werewolfCount: 0,
      villagerTeamCount: 1,
    }).success).toBe(true)
  })

  it('requires hidden fields in the MJ assignment', () => {
    expect(hostPlayerAssignmentSchema.parse({
      player: {
        ...player,
        connected: true,
      },
      role,
      isDrunk: true,
      isVoyanteDecoy: false,
      bluffRoleId: null,
      specialInformation: null,
    })).toMatchObject({
      isDrunk: true,
      isVoyanteDecoy: false,
    })
  })
})

describe('game phase contracts', () => {
  it('models the public phase sequence from Night 1 forward', () => {
    const nightOne = createInitialGamePhase()
    const dayOne = getNextGamePhase(nightOne)
    const nightTwo = getNextGamePhase(dayOne)

    expect(nightOne).toEqual({ period: 'night', number: 1 })
    expect(dayOne).toEqual({ period: 'day', number: 1 })
    expect(nightTwo).toEqual({ period: 'night', number: 2 })
  })
})

describe('lobby contracts', () => {
  const lobby = {
    id: LOBBY_ID.MAIN,
    phase: LOBBY_PHASE.LOBBY,
    gamePhase: null,
    gameLog: [],
    dayVote: null,
    revision: 1,
    players: [
      {
        ...player,
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

  it('validates a lobby entry response', () => {
    expect(lobbyEntryResponseSchema.parse({
      session: {
        playerId: player.id,
        sessionToken: token,
      },
      lobby,
      destination: SESSION_DESTINATION.LOBBY,
    }).lobby).toEqual(lobby)
  })

  it('rejects inconsistent lobby limits', () => {
    expect(lobbySnapshotSchema.safeParse({
      ...lobby,
      minimumPlayers: 13,
      maximumPlayers: 12,
    }).success).toBe(false)
  })
})

describe('acknowledgements', () => {
  const ackSchema = createAckSchema(lobbyEnterCommandSchema)

  it('validates success and failure results', () => {
    expect(ackSchema.parse(ackSuccess({ playerName: 'Marc' }))).toEqual({
      ok: true,
      data: { playerName: 'Marc' },
    })

    const error = publicErrorSchema.parse({
      code: ERROR_CODE.LOBBY_FULL,
      message: 'Le lobby est complète.',
    })
    expect(ackSchema.parse(ackFailure(error))).toEqual({
      ok: false,
      error,
    })
  })
})

describe('simulator contracts', () => {
  it('accepts only the supported player-count boundary', () => {
    expect(simulatorCreateCommandSchema.safeParse({ playerCount: PLAYER_COUNT_LIMIT.MINIMUM }).success).toBe(true)
    expect(simulatorCreateCommandSchema.safeParse({ playerCount: PLAYER_COUNT_LIMIT.MAXIMUM }).success).toBe(true)
    expect(simulatorCreateCommandSchema.safeParse({ playerCount: PLAYER_COUNT_LIMIT.MINIMUM - 1 }).success).toBe(false)
    expect(simulatorCreateCommandSchema.safeParse({ playerCount: PLAYER_COUNT_LIMIT.MAXIMUM + 1 }).success).toBe(false)
  })
})

describe('event constants', () => {
  it('keeps every Socket.IO event name unique', () => {
    const eventNames = Object.values(SOCKET_EVENT)
    expect(new Set(eventNames).size).toBe(eventNames.length)
  })
})
