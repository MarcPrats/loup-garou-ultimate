import {
  findPlayerWithRole,
  roleFor,
  type AssignmentMap,
} from './player-assignments'
import { pickRandom, shuffle, type RandomSource } from './random'
import {
  ROLE_ID,
  isNonUltimateWerewolfRole,
  isTrueVillagerRole,
  isVillageTeamRole,
  type NonUltimateWerewolfRoleId,
  type TrueVillagerRoleId,
} from './roles'
import type {
  AssignablePlayer,
  PetiteFilleInformation,
  PlayerId,
  RenardInformation,
} from './types'

function buildVisiblePlayerPair(
  selectedPlayer: AssignablePlayer,
  excludedPlayerId: PlayerId,
  players: readonly AssignablePlayer[],
  random: RandomSource,
): readonly [PlayerId, PlayerId] {
  const candidates = players.filter(
    (player) => player.id !== excludedPlayerId && player.id !== selectedPlayer.id,
  )
  const secondPlayer = pickRandom(candidates, random)
  const visiblePlayers = shuffle([selectedPlayer, secondPlayer], random)
  const first = visiblePlayers[0]
  const second = visiblePlayers[1]

  if (!first || !second) throw new Error('Expected two visible players')
  return [first.id, second.id]
}

export function buildRenardInformation(
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  random: RandomSource,
): RenardInformation | null {
  const renardPlayer = findPlayerWithRole(players, assignments, ROLE_ID.RENARD)
  if (!renardPlayer) return null

  const candidates = players.filter((player) =>
    isNonUltimateWerewolfRole(roleFor(assignments, player.id)),
  )
  const selectedWerewolf = pickRandom(candidates, random)

  return {
    playerId: renardPlayer.id,
    roleId: roleFor(assignments, selectedWerewolf.id) as NonUltimateWerewolfRoleId,
    seenPlayerIds: buildVisiblePlayerPair(
      selectedWerewolf,
      renardPlayer.id,
      players,
      random,
    ),
  }
}

export function buildPetiteFilleInformation(
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  drunkPlayerId: PlayerId | null,
  random: RandomSource,
): PetiteFilleInformation | null {
  const petiteFillePlayer = findPlayerWithRole(
    players,
    assignments,
    ROLE_ID.PETITE_FILLE,
  )
  if (!petiteFillePlayer) return null

  const candidates = players.filter((player) => {
    const roleId = roleFor(assignments, player.id)
    return player.id !== petiteFillePlayer.id
      && player.id !== drunkPlayerId
      && isTrueVillagerRole(roleId)
  })
  const selectedVillager = pickRandom(candidates, random)

  return {
    playerId: petiteFillePlayer.id,
    roleId: roleFor(assignments, selectedVillager.id) as TrueVillagerRoleId,
    seenPlayerIds: buildVisiblePlayerPair(
      selectedVillager,
      petiteFillePlayer.id,
      players,
      random,
    ),
  }
}

export function selectVoyanteDecoyPlayerId(
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  random: RandomSource,
): PlayerId | null {
  const voyantePlayer = findPlayerWithRole(players, assignments, ROLE_ID.VOYANTE)
  if (!voyantePlayer) return null

  const candidates = players.filter((player) =>
    isVillageTeamRole(roleFor(assignments, player.id)),
  )

  return pickRandom(candidates, random).id
}
