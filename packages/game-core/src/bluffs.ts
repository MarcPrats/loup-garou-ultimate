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

function selectRenardBluffInformation(
  werewolfPlayerId: PlayerId,
  werewolfPlayers: readonly AssignablePlayer[],
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  random: RandomSource,
): {
  readonly roleId: NonUltimateWerewolfRoleId
  readonly seenPlayerIds: readonly [PlayerId, PlayerId]
} | null {
  const candidates = werewolfPlayers.filter((player) =>
    player.id !== werewolfPlayerId
      && isNonUltimateWerewolfRole(roleFor(assignments, player.id)),
  )
  const selectedWerewolf = candidates.length > 0
    ? pickRandom(candidates, random)
    : null
  if (!selectedWerewolf) return null

  const secondCandidates = players.filter(
    (player) =>
      player.id !== werewolfPlayerId
      && player.id !== selectedWerewolf.id,
  )
  const secondPlayer = secondCandidates.length > 0
    ? pickRandom(secondCandidates, random)
    : null
  if (!secondPlayer) return null

  const visiblePlayers = shuffle(
    [selectedWerewolf.id, secondPlayer.id],
    random,
  )
  const first = visiblePlayers[0]
  const second = visiblePlayers[1]
  if (!first || !second) return null

  return {
    roleId: roleFor(assignments, selectedWerewolf.id) as NonUltimateWerewolfRoleId,
    seenPlayerIds: [first, second],
  }
}

function selectPetiteFilleBluffInformation(
  werewolfPlayerId: PlayerId,
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  drunkPlayerId: PlayerId | null,
  random: RandomSource,
): {
  readonly roleId: TrueVillagerRoleId
  readonly seenPlayerIds: readonly [PlayerId, PlayerId]
} | null {
  const candidates = players.filter((player) => {
    const roleId = roleFor(assignments, player.id)
    return player.id !== drunkPlayerId && isTrueVillagerRole(roleId)
  })
  const selectedVillager = candidates.length > 0
    ? pickRandom(candidates, random)
    : null
  if (!selectedVillager) return null

  const secondCandidates = players.filter(
    (player) =>
      player.id !== werewolfPlayerId
      && player.id !== selectedVillager.id,
  )
  const secondPlayer = secondCandidates.length > 0
    ? pickRandom(secondCandidates, random)
    : null
  if (!secondPlayer) return null

  const visiblePlayers = shuffle(
    [selectedVillager.id, secondPlayer.id],
    random,
  )
  const first = visiblePlayers[0]
  const second = visiblePlayers[1]
  if (!first || !second) return null

  return {
    roleId: roleFor(assignments, selectedVillager.id) as TrueVillagerRoleId,
    seenPlayerIds: [first, second],
  }
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

    if (bluffRoleId === ROLE_ID.RENARD) {
      const renardInformation = selectRenardBluffInformation(
        werewolf.id,
        werewolfPlayers,
        players,
        assignments,
        random,
      )
      if (!renardInformation) continue

      information.push({
        playerId: werewolf.id,
        type: BLUFF_INFORMATION_TYPE.RENARD,
        ...renardInformation,
      })
      continue
    }

    const petiteFilleInformation = selectPetiteFilleBluffInformation(
      werewolf.id,
      players,
      assignments,
      drunkPlayerId,
      random,
    )
    if (!petiteFilleInformation) continue

    information.push({
      playerId: werewolf.id,
      type: BLUFF_INFORMATION_TYPE.PETITE_FILLE,
      ...petiteFilleInformation,
    })
  }

  return information
}
