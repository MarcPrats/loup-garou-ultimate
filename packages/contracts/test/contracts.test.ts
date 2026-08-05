import { describe, expect, it } from 'vitest'

import {
  APPLICATION,
  ERROR_CODE,
  PLAYER_COUNT_LIMIT,
  ROLE_CATEGORY,
  ROOM_ID,
  ROOM_PHASE,
  SESSION_DESTINATION,
  SOCKET_EVENT,
  TEAM,
  ackFailure,
  ackSuccess,
  createAckSchema,
  healthResponseSchema,
  hostDashboardSchema,
  hostPlayerAssignmentSchema,
  privateAssignmentSchema,
  publicErrorSchema,
  roomEntryResponseSchema,
  roomEnterCommandSchema,
  roomSnapshotSchema,
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

describe('command contracts', () => {
  it('trims and validates player names', () => {
    expect(roomEnterCommandSchema.parse({ playerName: '  Marc  ' })).toEqual({
      playerName: 'Marc',
    })
    expect(roomEnterCommandSchema.safeParse({ playerName: '' }).success).toBe(false)
    expect(roomEnterCommandSchema.safeParse({
      playerName: 'Marc',
      clientRequestId: 'entry_request_00000000000000000001',
    }).success).toBe(true)
    expect(roomEnterCommandSchema.safeParse({
      playerName: 'Marc',
      clientRequestId: 'short',
    }).success).toBe(false)
    expect(roomEnterCommandSchema.safeParse({ playerName: 'Marc', isHost: true }).success).toBe(false)
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

describe('room contracts', () => {
  const room = {
    id: ROOM_ID.MAIN,
    phase: ROOM_PHASE.LOBBY,
    revision: 1,
    players: [
      {
        ...player,
        isHost: true,
        connected: true,
      },
    ],
    minimumPlayers: 5,
    maximumPlayers: 12,
    canStart: false,
    createdAt: 1,
  }

  it('validates a room entry response', () => {
    expect(roomEntryResponseSchema.parse({
      session: {
        playerId: player.id,
        sessionToken: token,
      },
      room,
      destination: SESSION_DESTINATION.LOBBY,
    }).room).toEqual(room)
  })

  it('rejects inconsistent room limits', () => {
    expect(roomSnapshotSchema.safeParse({
      ...room,
      minimumPlayers: 13,
      maximumPlayers: 12,
    }).success).toBe(false)
  })
})

describe('acknowledgements', () => {
  const ackSchema = createAckSchema(roomEnterCommandSchema)

  it('validates success and failure results', () => {
    expect(ackSchema.parse(ackSuccess({ playerName: 'Marc' }))).toEqual({
      ok: true,
      data: { playerName: 'Marc' },
    })

    const error = publicErrorSchema.parse({
      code: ERROR_CODE.ROOM_FULL,
      message: 'La salle est complète.',
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
