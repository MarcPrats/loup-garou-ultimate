import {
  AVAILABLE_OUTSIDER_IDS,
  OUTSIDER_ID,
  getGameComposition,
  type GameComposition,
  type OutsiderId,
} from './constants'
import { roleFor, type AssignmentMap } from './player-assignments'
import { pickRandom, shuffle, type RandomSource } from './random'
import {
  ROLE_CATEGORY,
  ROLE_DEFINITIONS,
  ROLE_ID,
  getRoleIdsByCategory,
  isNonUltimateWerewolfRole,
  isVillageTeamRole,
  type RoleId,
  type TrueVillagerRoleId,
} from './roles'
import type { AssignablePlayer, PlayerId } from './types'

const nonUltimateWerewolfRoleIds = ROLE_DEFINITIONS
  .map((role) => role.id)
  .filter(isNonUltimateWerewolfRole)

const trueVillagerRoleIds = getRoleIdsByCategory(
  ROLE_CATEGORY.VILLAGER,
) as TrueVillagerRoleId[]

export function validatePlayerCount(playerCount: number): void {
  getGameComposition(playerCount)
}

export function validatePlayers(players: readonly AssignablePlayer[]): void {
  validatePlayerCount(players.length)

  const ids = new Set<PlayerId>()
  for (const player of players) {
    if (!player.id) throw new Error('Player IDs cannot be empty')
    if (ids.has(player.id)) throw new Error(`Duplicate player ID: ${player.id}`)
    ids.add(player.id)
  }
}

export function getWerewolfCount(playerCount: number): number {
  return getGameComposition(playerCount).werewolves
}

export function selectOutsiders(
  outsiderCount: number,
  random: RandomSource,
): readonly OutsiderId[] {
  if (outsiderCount < 0 || !Number.isInteger(outsiderCount)) {
    throw new RangeError(`Invalid outsider count: ${outsiderCount}`)
  }
  if (outsiderCount > AVAILABLE_OUTSIDER_IDS.length) {
    throw new RangeError(
      `Cannot select ${outsiderCount} outsiders from ${AVAILABLE_OUTSIDER_IDS.length} available outsiders.`,
    )
  }
  if (outsiderCount === 0) return []
  if (outsiderCount === 1) return [pickRandom(AVAILABLE_OUTSIDER_IDS, random)]
  if (outsiderCount === AVAILABLE_OUTSIDER_IDS.length) {
    return [...AVAILABLE_OUTSIDER_IDS]
  }

  return shuffle(AVAILABLE_OUTSIDER_IDS, random).slice(0, outsiderCount)
}

export function includesOutsider(
  outsiders: readonly OutsiderId[],
  expectedOutsider: OutsiderId,
): boolean {
  return outsiders.includes(expectedOutsider)
}

export function buildRolePool(
  playerCount: number,
  composition: GameComposition,
  selectedOutsiders: readonly OutsiderId[],
  random: RandomSource,
): RoleId[] {
  const rolePool: RoleId[] = [ROLE_ID.ULTIMATE_WEREWOLF]
  const shuffledWerewolves = shuffle(nonUltimateWerewolfRoleIds, random)

  rolePool.push(...shuffledWerewolves.slice(0, composition.werewolves - 1))
  if (includesOutsider(selectedOutsiders, OUTSIDER_ID.ANGEL)) {
    rolePool.push(ROLE_ID.ANGEL)
  }

  // An Ivrogne receives a Villageois card, so its slot is intentionally
  // included in the number of remaining Villageois role cards.
  const villagersNeeded = playerCount - rolePool.length
  rolePool.push(...shuffle(trueVillagerRoleIds, random).slice(0, villagersNeeded))

  return rolePool
}

export function selectDrunkPlayerId(
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  selectedOutsiders: readonly OutsiderId[],
  random: RandomSource,
): PlayerId | null {
  if (!includesOutsider(selectedOutsiders, OUTSIDER_ID.DRUNK)) return null

  const candidates = players.filter((player) => {
    const roleId = roleFor(assignments, player.id)
    return isVillageTeamRole(roleId) && roleId !== ROLE_ID.ANGEL
  })

  return pickRandom(candidates, random).id
}
