import { BLUFF_INFORMATION_TYPE } from './constants'
import { roleFor, type AssignmentMap } from './player-assignments'
import { pickRandom, shuffle, type RandomSource } from './random'
import {
  ROLE_DEFINITIONS,
  ROLE_ID,
  isNonUltimateWerewolfRole,
  isTrueVillagerRole,
  isVillageTeamRole,
  type NonUltimateWerewolfRoleId,
  type TrueVillagerRoleId,
  type VillageTeamRoleId,
} from './roles'
import type {
  AssignablePlayer,
  BluffRoleAssignment,
  BluffSpecialInformation,
  PlayerId,
} from './types'

export interface BluffRoleResult {
  readonly assignments: readonly BluffRoleAssignment[]
  readonly roleByPlayerId: ReadonlyMap<PlayerId, VillageTeamRoleId>
}

const villageTeamRoleIds = ROLE_DEFINITIONS
  .map((role) => role.id)
  .filter(isVillageTeamRole)

const nonUltimateWerewolfRoleIds = ROLE_DEFINITIONS
  .map((role) => role.id)
  .filter(isNonUltimateWerewolfRole)

export function assignBluffRoles(
  werewolfPlayers: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  random: RandomSource,
): BluffRoleResult {
  const roleIdsInPlay = new Set(assignments.values())
  const unusedRoleIds = villageTeamRoleIds.filter(
    (roleId) => !roleIdsInPlay.has(roleId),
  )
  const shuffledRoleIds = shuffle(unusedRoleIds, random)
  const roleByPlayerId = new Map<PlayerId, VillageTeamRoleId>()
  const bluffAssignments: BluffRoleAssignment[] = []

  werewolfPlayers.forEach((player, index) => {
    const roleId = shuffledRoleIds[index]
    if (!roleId) return

    roleByPlayerId.set(player.id, roleId)
    bluffAssignments.push({ playerId: player.id, roleId })
  })

  return { assignments: bluffAssignments, roleByPlayerId }
}

function selectFakePlayerIds(
  werewolfPlayerId: PlayerId,
  players: readonly AssignablePlayer[],
  random: RandomSource,
): readonly [PlayerId, PlayerId] | null {
  const candidates = players.filter((player) => player.id !== werewolfPlayerId)
  const shuffledPlayers = shuffle(candidates, random)
  const first = shuffledPlayers[0]
  const second = shuffledPlayers[1]

  return first && second ? [first.id, second.id] : null
}

function selectFakePetiteFilleRoleId(
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  drunkPlayerId: PlayerId | null,
  random: RandomSource,
): TrueVillagerRoleId {
  const candidates = players.filter((player) => {
    const roleId = roleFor(assignments, player.id)
    return player.id !== drunkPlayerId && isTrueVillagerRole(roleId)
  })
  const selectedVillager = pickRandom(candidates, random)
  return roleFor(assignments, selectedVillager.id) as TrueVillagerRoleId
}

export function buildBluffSpecialInformation(
  werewolfPlayers: readonly AssignablePlayer[],
  bluffRoleByPlayerId: ReadonlyMap<PlayerId, VillageTeamRoleId>,
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  drunkPlayerId: PlayerId | null,
  random: RandomSource,
): BluffSpecialInformation[] {
  const information: BluffSpecialInformation[] = []

  for (const werewolf of werewolfPlayers) {
    const bluffRoleId = bluffRoleByPlayerId.get(werewolf.id)
    const hasSpecialInformation = bluffRoleId === ROLE_ID.RENARD
      || bluffRoleId === ROLE_ID.PETITE_FILLE

    if (!hasSpecialInformation) continue

    const seenPlayerIds = selectFakePlayerIds(werewolf.id, players, random)
    if (!seenPlayerIds) continue

    if (bluffRoleId === ROLE_ID.RENARD) {
      information.push({
        playerId: werewolf.id,
        type: BLUFF_INFORMATION_TYPE.RENARD,
        roleId: pickRandom(
          nonUltimateWerewolfRoleIds,
          random,
        ) as NonUltimateWerewolfRoleId,
        seenPlayerIds,
      })
      continue
    }

    information.push({
      playerId: werewolf.id,
      type: BLUFF_INFORMATION_TYPE.PETITE_FILLE,
      roleId: selectFakePetiteFilleRoleId(
        players,
        assignments,
        drunkPlayerId,
        random,
      ),
      seenPlayerIds,
    })
  }

  return information
}
