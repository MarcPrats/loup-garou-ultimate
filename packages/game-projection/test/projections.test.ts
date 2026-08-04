import { describe, expect, it } from 'vitest'

import {
  ROLE_ACCESS_VIEW,
  type PlayerId,
} from '@lgu/contracts'
import {
  assignRoles,
  createSeededRandomSource,
} from '@lgu/game-core'

import {
  projectHostDashboard,
  projectPrivateAssignment,
  type GameProjectionState,
} from '../src'

function createState(): GameProjectionState {
  const regularPlayers = Array.from({ length: 5 }, (_, index) => ({
    id: `player_${index + 1}`,
    name: `Joueur ${index + 1}`,
  }))
  return {
    players: [
      {
        id: 'host_1',
        name: 'Le MJ',
        connected: true,
        isHost: true,
      },
      ...regularPlayers.map((player) => ({
        ...player,
        connected: true,
        isHost: false,
      })),
    ],
    assignment: assignRoles(
      regularPlayers,
      createSeededRandomSource('projection-test'),
    ),
    roleAccessGrants: [
      {
        playerId: 'host_1',
        token: 'role_host_0000000000000000000000000001',
        view: ROLE_ACCESS_VIEW.GAME_MASTER,
      },
      ...regularPlayers.map((player, index) => ({
        playerId: player.id,
        token: `role_player_${String(index + 1).padStart(28, '0')}`,
        view: ROLE_ACCESS_VIEW.PLAYER,
      })),
    ],
  }
}

describe('shared game projections', () => {
  it('keeps MJ-only modifier flags out of player assignments', () => {
    const state = createState()
    const playerId = state.assignment.assignments[0]!.playerId as PlayerId
    const assignment = projectPrivateAssignment(state, playerId)
    const serialized = JSON.stringify(assignment)

    expect(serialized).not.toContain('isDrunk')
    expect(serialized).not.toContain('isVoyanteDecoy')
    expect(assignment.player.id).toBe(playerId)
  })

  it('projects all hidden assignment data into the MJ dashboard', () => {
    const dashboard = projectHostDashboard(createState())

    expect(dashboard.players).toHaveLength(5)
    expect(dashboard.playerCount).toBe(5)
    expect(dashboard.players.every((player) => 'isDrunk' in player)).toBe(true)
    expect(dashboard.players.every((player) => 'isVoyanteDecoy' in player)).toBe(true)
  })

  it('is deterministic when the underlying assignment is deterministic', () => {
    expect(projectHostDashboard(createState())).toEqual(
      projectHostDashboard(createState()),
    )
  })
})
