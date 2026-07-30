import { assignBluffRoles, buildBluffSpecialInformation } from './bluffs'
import { getGameComposition } from './constants'
import {
  buildRolePool,
  selectDrunkPlayerId,
  selectOutsiders,
  validatePlayers,
} from './game-setup'
import {
  createAssignmentMap,
  getWerewolfPlayers,
  toPlayerAssignments,
} from './player-assignments'
import type { RandomSource } from './random'
import {
  buildPetiteFilleInformation,
  buildRenardInformation,
  selectVoyanteDecoyPlayerId,
} from './special-information'
import type { AssignablePlayer, AssignmentResult } from './types'

export function assignRoles(
  players: readonly AssignablePlayer[],
  random: RandomSource,
): AssignmentResult {
  validatePlayers(players)

  const playerCount = players.length
  const composition = getGameComposition(playerCount)
  const selectedOutsiders = selectOutsiders(composition.outsiders, random)
  const rolePool = buildRolePool(
    playerCount,
    composition,
    selectedOutsiders,
    random,
  )
  const assignments = createAssignmentMap(players, rolePool, random)
  const drunkPlayerId = selectDrunkPlayerId(
    players,
    assignments,
    selectedOutsiders,
    random,
  )
  const renardInformation = buildRenardInformation(
    players,
    assignments,
    random,
  )
  const petiteFilleInformation = buildPetiteFilleInformation(
    players,
    assignments,
    drunkPlayerId,
    random,
  )
  const werewolfPlayers = getWerewolfPlayers(players, assignments)
  const bluffRoles = assignBluffRoles(werewolfPlayers, assignments, random)
  const voyanteDecoyPlayerId = selectVoyanteDecoyPlayerId(
    players,
    assignments,
    random,
  )
  const bluffSpecialInformation = buildBluffSpecialInformation(
    werewolfPlayers,
    bluffRoles.roleByPlayerId,
    players,
    assignments,
    drunkPlayerId,
    random,
  )

  return {
    assignments: toPlayerAssignments(players, assignments, drunkPlayerId),
    drunkPlayerId,
    renardInformation,
    petiteFilleInformation,
    bluffRoles: bluffRoles.assignments,
    voyanteDecoyPlayerId,
    bluffSpecialInformation,
  }
}
