import { BLUFF_INFORMATION_TYPE } from './constants'
import { roleFor, type AssignmentMap } from './player-assignments'
import { pickRandom, shuffle, type RandomSource } from './random'
import { buildVisiblePlayerPair } from './special-information'
import {
  ROLE_CATEGORY,
  ROLE_DEFINITIONS,
  ROLE_ID,
  getEffectiveCategory,
  isNonUltimateWerewolfRole,
  isTrueVillagerRole,
  isVillageTeamRole,
  type NonUltimateWerewolfRoleId,
  type OutsiderRoleId,
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
  readonly roleId: NonUltimateWerewolfRoleId | null
  readonly seenPlayerIds: readonly PlayerId[]
} {
  const candidates = werewolfPlayers.filter((player) =>
    player.id !== werewolfPlayerId
      && isNonUltimateWerewolfRole(roleFor(assignments, player.id)),
  )
  const selectedWerewolf = candidates.length > 0
    ? pickRandom(candidates, random)
    : null
  if (!selectedWerewolf) return { roleId: null, seenPlayerIds: [] }

  const secondCandidates = players.filter(
    (player) =>
      player.id !== werewolfPlayerId
      && player.id !== selectedWerewolf.id,
  )
  const secondPlayer = secondCandidates.length > 0
    ? pickRandom(secondCandidates, random)
    : null
  if (!secondPlayer) return { roleId: null, seenPlayerIds: [] }

  const visiblePlayers = shuffle(
    [selectedWerewolf.id, secondPlayer.id],
    random,
  )
  const first = visiblePlayers[0]
  const second = visiblePlayers[1]
  if (!first || !second) return { roleId: null, seenPlayerIds: [] }

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
  readonly roleId: TrueVillagerRoleId | null
  readonly seenPlayerIds: readonly PlayerId[]
} {
  const candidates = players.filter((player) => {
    const roleId = roleFor(assignments, player.id)
    return player.id !== drunkPlayerId && isTrueVillagerRole(roleId)
  })
  const selectedVillager = candidates.length > 0
    ? pickRandom(candidates, random)
    : null
  if (!selectedVillager) return { roleId: null, seenPlayerIds: [] }

  const secondCandidates = players.filter(
    (player) =>
      player.id !== werewolfPlayerId
      && player.id !== selectedVillager.id,
  )
  const secondPlayer = secondCandidates.length > 0
    ? pickRandom(secondCandidates, random)
    : null
  if (!secondPlayer) return { roleId: null, seenPlayerIds: [] }

  const visiblePlayers = shuffle(
    [selectedVillager.id, secondPlayer.id],
    random,
  )
  const first = visiblePlayers[0]
  const second = visiblePlayers[1]
  if (!first || !second) return { roleId: null, seenPlayerIds: [] }

  return {
    roleId: roleFor(assignments, selectedVillager.id) as TrueVillagerRoleId,
    seenPlayerIds: [first, second],
  }
}

function selectBibliothecaireBluffInformation(
  werewolfPlayerId: PlayerId,
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  drunkPlayerId: PlayerId | null,
  random: RandomSource,
): {
  readonly roleId: OutsiderRoleId | null
  readonly seenPlayerIds: readonly PlayerId[]
} {
  const outsiders = players.filter((player) => (
    player.id !== werewolfPlayerId
      && getEffectiveCategory(
        roleFor(assignments, player.id),
        player.id === drunkPlayerId,
      ) === ROLE_CATEGORY.OUTSIDER
  ))
  if (outsiders.length === 0) return { roleId: null, seenPlayerIds: [] }

  const selectedOutsider = pickRandom(outsiders, random)
  return {
    roleId: roleFor(assignments, selectedOutsider.id) as OutsiderRoleId,
    seenPlayerIds: buildVisiblePlayerPair(selectedOutsider, werewolfPlayerId, players, random),
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
      || bluffRoleId === ROLE_ID.BIBLIOTHECAIRE

    if (!hasSpecialInformation) continue

    if (bluffRoleId === ROLE_ID.RENARD) {
      const renardInformation = selectRenardBluffInformation(
        werewolf.id,
        werewolfPlayers,
        players,
        assignments,
        random,
      )
      information.push({
        playerId: werewolf.id,
        type: BLUFF_INFORMATION_TYPE.RENARD,
        ...renardInformation,
      })
      continue
    }

    if (bluffRoleId === ROLE_ID.BIBLIOTHECAIRE) {
      const bibliothecaireInformation = selectBibliothecaireBluffInformation(
        werewolf.id,
        players,
        assignments,
        drunkPlayerId,
        random,
      )
      information.push({
        playerId: werewolf.id,
        type: BLUFF_INFORMATION_TYPE.BIBLIOTHECAIRE,
        ...bibliothecaireInformation,
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
    information.push({
      playerId: werewolf.id,
      type: BLUFF_INFORMATION_TYPE.PETITE_FILLE,
      ...petiteFilleInformation,
    })
  }

  return information
}
