import { describe, expect, it } from 'vitest'

import {
  AVAILABLE_OUTSIDER_IDS,
  GAME_COMPOSITION_BY_PLAYER_COUNT,
  OUTSIDER_ID,
  PLAYER_COUNT,
  ROLE_CATEGORY,
  ROLE_ID,
  SUPPORTED_PLAYER_COUNTS,
  assignRoles,
  getEffectiveCategory,
  isVillageTeamRole,
  isWerewolfRole,
  type AssignablePlayer,
  type AssignmentResult,
  type PlayerAssignment,
} from '../src'
import { createSeededValues, createTapeRandomSource } from './support/random'

function makePlayers(playerCount: number): AssignablePlayer[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Joueur ${index + 1}`,
  }))
}

function assignWithSeed(playerCount: number, seed: number): AssignmentResult {
  return assignRoles(
    makePlayers(playerCount),
    createTapeRandomSource(createSeededValues(seed)),
  )
}

function assignmentFor(
  result: AssignmentResult,
  playerId: string,
): PlayerAssignment {
  const assignment = result.assignments.find((item) => item.playerId === playerId)
  if (!assignment) throw new Error(`Missing assignment for ${playerId}`)
  return assignment
}

describe('assignRoles', () => {
  const expectedCompositions = [
    [5, 3, 0, 2],
    [6, 3, 1, 2],
    [7, 5, 0, 2],
    [8, 5, 1, 2],
    [9, 5, 2, 2],
    [10, 7, 0, 3],
    [11, 7, 1, 3],
    [12, 7, 2, 3],
  ] as const

  it.each(expectedCompositions)(
    'assigns %i players as %i Villageois, %i Marginaux and %i Loups Garous',
    (playerCount, villagerCount, outsiderCount, werewolfCount) => {
      expect(GAME_COMPOSITION_BY_PLAYER_COUNT[playerCount]).toEqual({
        villagers: villagerCount,
        outsiders: outsiderCount,
        werewolves: werewolfCount,
      })

      for (let seed = 1; seed <= 100; seed += 1) {
        const result = assignWithSeed(playerCount, seed)
        const assignedOutsiderRoles = result.assignments.filter(
          (assignment) => getRoleDefinition(assignment.roleId).category === ROLE_CATEGORY.OUTSIDER,
        )
        const assignedWerewolves = result.assignments.filter(
          (assignment) => isWerewolfRole(assignment.roleId),
        )
        const assignedOutsiders = assignedOutsiderRoles.length + Number(Boolean(result.drunkPlayerId))

        expect(result.assignments).toHaveLength(playerCount)
        expect(new Set(result.assignments.map((assignment) => assignment.playerId)).size).toBe(
          playerCount,
        )
        expect(assignedWerewolves).toHaveLength(werewolfCount)
        expect(assignedOutsiders).toBe(outsiderCount)
        expect(playerCount - assignedWerewolves.length - assignedOutsiders).toBe(villagerCount)
      }
    },
  )

  it('rejects unsupported player counts and duplicate IDs', () => {
    expect(() => assignWithSeed(PLAYER_COUNT.MINIMUM - 1, 1)).toThrow(/between 5 and 12/)
    expect(() => assignWithSeed(PLAYER_COUNT.MAXIMUM + 1, 1)).toThrow(/between 5 and 12/)
    expect(() =>
      assignRoles(
        [
          { id: 'duplicate', name: 'A' },
          { id: 'duplicate', name: 'B' },
          { id: '3', name: 'C' },
          { id: '4', name: 'D' },
          { id: '5', name: 'E' },
        ],
        createTapeRandomSource(createSeededValues(1)),
      ),
    ).toThrow(/Duplicate player ID/)
  })

  it('selects the configured number of Marginaux without replacement', () => {
    for (const playerCount of SUPPORTED_PLAYER_COUNTS) {
      const composition = GAME_COMPOSITION_BY_PLAYER_COUNT[playerCount]
      const observedSingleOutsiders = new Set<string>()

      for (let seed = 1; seed <= 400; seed += 1) {
        const result = assignWithSeed(playerCount, seed)
        const assignedOutsiderRoles = result.assignments.filter(
          (assignment) => getRoleDefinition(assignment.roleId).category === ROLE_CATEGORY.OUTSIDER,
        )
        const drunkPresent = Boolean(result.drunkPlayerId)
        const outsiderCount = assignedOutsiderRoles.length + Number(drunkPresent)

        expect(outsiderCount).toBe(composition.outsiders)

        if (composition.outsiders === 1) {
          const selectedOutsider = drunkPresent
            ? OUTSIDER_ID.DRUNK
            : assignedOutsiderRoles[0]?.roleId
          if (selectedOutsider) observedSingleOutsiders.add(selectedOutsider)
        }
        if (composition.outsiders === 2) {
          expect(assignedOutsiderRoles.length + Number(drunkPresent)).toBe(2)
        }
      }

      if (composition.outsiders === 1) {
        expect(observedSingleOutsiders).toEqual(new Set(AVAILABLE_OUTSIDER_IDS))
      }
    }
  })

  it('restricts Petite Fille information to an effective Villageois', () => {
    let checked = 0
    for (const playerCount of SUPPORTED_PLAYER_COUNTS.filter(
      (count) => GAME_COMPOSITION_BY_PLAYER_COUNT[count].outsiders > 0,
    )) {
      for (let seed = 1; seed <= 800; seed += 1) {
        const result = assignWithSeed(playerCount, seed)
        const info = result.petiteFilleInformation
        if (!info) continue
        checked += 1

        const target = result.assignments.find(
          (assignment) =>
            assignment.roleId === info.roleId
            && info.seenPlayerIds.includes(assignment.playerId),
        )
        expect(target).toBeDefined()
        expect(target?.playerId).not.toBe(result.drunkPlayerId)
        expect(getEffectiveCategory(info.roleId, false)).toBe(ROLE_CATEGORY.VILLAGER)
        expect(getRoleDefinition(info.roleId).category).toBe(ROLE_CATEGORY.VILLAGER)
        expect(info.seenPlayerIds).not.toContain(info.playerId)
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('shows the Renard a non-ultimate werewolf and two valid players', () => {
    let checked = 0
    for (let seed = 1; seed <= 1000; seed += 1) {
      const result = assignWithSeed(PLAYER_COUNT.MAXIMUM, seed)
      const info = result.renardInformation
      if (!info) continue
      checked += 1

      expect([ROLE_ID.INFECT_WEREWOLF, ROLE_ID.GRAND_WEREWOLF]).toContain(info.roleId)
      expect(info.roleId).not.toBe(ROLE_ID.ULTIMATE_WEREWOLF)
      expect(info.seenPlayerIds).not.toContain(info.playerId)
      expect(
        result.assignments.some(
          (assignment) =>
            assignment.roleId === info.roleId
            && info.seenPlayerIds.includes(assignment.playerId),
        ),
      ).toBe(true)
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('allows any Villageois or Marginal, including Voyante, as the decoy', () => {
    const observedRoleIds = new Set<string>()
    let checked = 0

    for (let seed = 1; seed <= 5000; seed += 1) {
      const result = assignWithSeed(9, seed)
      if (!result.voyanteDecoyPlayerId) continue
      checked += 1
      const decoy = assignmentFor(result, result.voyanteDecoyPlayerId)
      expect(isVillageTeamRole(decoy.roleId)).toBe(true)
      observedRoleIds.add(decoy.roleId)
      if (observedRoleIds.has(ROLE_ID.VOYANTE) && observedRoleIds.has(ROLE_ID.ANGEL)) break
    }

    expect(checked).toBeGreaterThan(0)
    expect(observedRoleIds.has(ROLE_ID.VOYANTE)).toBe(true)
    expect(observedRoleIds.has(ROLE_ID.ANGEL)).toBe(true)
  })

  it('gives every werewolf a unique unused Villageois or Marginal bluff role', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const result = assignWithSeed(PLAYER_COUNT.MAXIMUM, seed)
      const wolves = result.assignments.filter(
        (assignment) => isWerewolfRole(assignment.roleId),
      )
      const rolesInPlay = new Set(result.assignments.map((assignment) => assignment.roleId))

      expect(result.bluffRoles).toHaveLength(wolves.length)
      expect(new Set(result.bluffRoles.map((bluff) => bluff.roleId)).size).toBe(wolves.length)
      for (const bluff of result.bluffRoles) {
        expect(rolesInPlay.has(bluff.roleId)).toBe(false)
        expect(isVillageTeamRole(bluff.roleId)).toBe(true)
      }
    }
  })
})
