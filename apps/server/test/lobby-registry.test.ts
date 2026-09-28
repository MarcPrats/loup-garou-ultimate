import { describe, expect, it, vi } from 'vitest'

import { LOBBY_PHASE, type LobbySnapshot } from '@lgu/contracts'

import { LobbyRegistry } from '../src/application/lobby-registry'
import type { LobbyService } from '../src/application/lobby-service'

function createSnapshot(overrides: Partial<LobbySnapshot> = {}): LobbySnapshot {
  return {
    id: 'loup_garou_test',
    phase: LOBBY_PHASE.STARTED,
    gamePhase: { period: 'night', number: 1 },
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
    ...overrides,
  }
}

describe('LobbyRegistry.list', () => {
  it('includes active started games for recovery', async () => {
    const service = {
      getLobbySnapshot: vi.fn(async () => createSnapshot()),
    } as unknown as LobbyService
    const registry = new LobbyRegistry(() => service)
    const { lobbyId } = registry.createLobby()

    const lobbies = await registry.list()

    expect(lobbies).toHaveLength(1)
    expect(lobbies[0]?.id).toBe(lobbyId)
    expect(lobbies[0]?.phase).toBe(LOBBY_PHASE.STARTED)
  })

  it('does not include finished games in recovery listing', async () => {
    const service = {
      getLobbySnapshot: vi.fn(async () => createSnapshot({ gameEnded: true })),
    } as unknown as LobbyService
    const registry = new LobbyRegistry(() => service)
    registry.createLobby()

    await expect(registry.list()).resolves.toEqual([])
  })
})
