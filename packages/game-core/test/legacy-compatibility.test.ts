import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import {
  SUPPORTED_PLAYER_COUNTS,
  assignRoles,
  type AssignablePlayer,
  type AssignmentResult,
} from '../src'
import { createSeededValues, createTapeRandomSource } from './support/random'

const EXPECTED_LEGACY_SLICE_HASH =
  '19c85f53039fffb8769d8afec76afdc14f1c7bc9dd5ddc5e3c4aa3354b478367'

interface LegacyPlayer {
  socketId: string
  playerId: string
  name: string
  isHost: boolean
}

interface LegacyRunner {
  assignRoles(players: LegacyPlayer[], hostSocketId: string): Record<string, unknown>
  setRandom(random: () => number): void
}

function createLegacyRunner(): LegacyRunner {
  const source = readFileSync(new URL('../../../server.js', import.meta.url), 'utf8')
  const start = source.indexOf('const GAME_ROLES = [')
  const end = source.indexOf('// Development-only game simulation state.')
  if (start < 0 || end < 0) throw new Error('Unable to locate legacy assignment source')

  const assignmentSource = source.slice(start, end)
  const hash = createHash('sha256').update(assignmentSource).digest('hex')
  expect(hash).toBe(EXPECTED_LEGACY_SLICE_HASH)

  const sandbox: Record<string, unknown> = {
    Math: Object.create(Math) as Math,
  }
  runInNewContext(
    `${assignmentSource}\nglobalThis.__legacyAssignRoles = assignRoles;`,
    sandbox,
  )

  return {
    assignRoles: sandbox.__legacyAssignRoles as LegacyRunner['assignRoles'],
    setRandom(random) {
      ;(sandbox.Math as Math & { random: () => number }).random = random
    },
  }
}

function makePlayers(playerCount: number): AssignablePlayer[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Joueur ${index + 1}`,
  }))
}

function normalizeCore(result: AssignmentResult) {
  return {
    assignments: result.assignments.map(({ playerId, roleId }) => [playerId, roleId]),
    drunkPlayerId: result.drunkPlayerId,
    renardInformation: result.renardInformation,
    petiteFilleInformation: result.petiteFilleInformation,
    bluffRoles: result.bluffRoles.map(({ playerId, roleId }) => [playerId, roleId]),
    voyanteDecoyPlayerId: result.voyanteDecoyPlayerId,
    bluffSpecialInformation: result.bluffSpecialInformation,
  }
}

function normalizeLegacy(
  value: Record<string, unknown>,
  players: readonly AssignablePlayer[],
) {
  const nameToId = new Map(players.map((player) => [player.name, player.id]))
  const namesToIds = (names: readonly string[]) => Array.from(names, (name) => {
    const playerId = nameToId.get(name)
    if (!playerId) throw new Error(`Unknown legacy player name: ${name}`)
    return playerId
  })

  const assignments = value.assignments as Map<string, { id: string }>
  const bluffRoles = value.werewolfBluffRoles as Map<string, { id: string }>
  const bluffInfo = value.werewolfBluffSpecialInfo as Map<
    string,
    {
      type: 'renard' | 'petite-fille'
      role: { id: string }
      twoPlayerNames: string[]
    }
  >
  const renard = value.renardInfo as
    | {
        renardSocketId: string
        werewolfRole: { id: string }
        twoPlayerNames: string[]
      }
    | null
  const petiteFille = value.petiteFilleInfo as
    | {
        petiteFilleSocketId: string
        villagerRole: { id: string }
        twoPlayerNames: string[]
      }
    | null

  return {
    assignments: Array.from(assignments.entries()).map(([playerId, role]) => [playerId, role.id]),
    drunkPlayerId: value.drunkPlayerSocketId,
    renardInformation: renard
      ? {
          playerId: renard.renardSocketId,
          roleId: renard.werewolfRole.id,
          seenPlayerIds: namesToIds(renard.twoPlayerNames),
        }
      : null,
    petiteFilleInformation: petiteFille
      ? {
          playerId: petiteFille.petiteFilleSocketId,
          roleId: petiteFille.villagerRole.id,
          seenPlayerIds: namesToIds(petiteFille.twoPlayerNames),
        }
      : null,
    bluffRoles: Array.from(bluffRoles.entries()).map(([playerId, role]) => [playerId, role.id]),
    voyanteDecoyPlayerId: value.voyanteDecoySocketId,
    bluffSpecialInformation: Array.from(bluffInfo.entries()).map(([playerId, info]) => ({
      playerId,
      type: info.type,
      roleId: info.role.id,
      seenPlayerIds: namesToIds(info.twoPlayerNames),
    })),
  }
}

describe('legacy assignment compatibility', () => {
  it('matches the pinned legacy algorithm for deterministic random tapes', () => {
    const legacy = createLegacyRunner()

    for (const playerCount of SUPPORTED_PLAYER_COUNTS) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const players = makePlayers(playerCount)
        const values = createSeededValues(playerCount * 10_000 + seed)
        const legacyRandom = createTapeRandomSource(values)
        const coreRandom = createTapeRandomSource(values)

        legacy.setRandom(() => legacyRandom.next())
        const legacyPlayers: LegacyPlayer[] = [
          {
            socketId: 'host',
            playerId: 'host',
            name: 'Le MJ',
            isHost: true,
          },
          ...players.map((player) => ({
            socketId: player.id,
            playerId: player.id,
            name: player.name,
            isHost: false,
          })),
        ]

        const legacyResult = legacy.assignRoles(legacyPlayers, 'host')
        const coreResult = assignRoles(players, coreRandom)

        expect(normalizeCore(coreResult)).toEqual(normalizeLegacy(legacyResult, players))
        expect(coreRandom.consumed).toBe(legacyRandom.consumed)
      }
    }
  })
})
