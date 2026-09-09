import { assignBluffRoles, buildBluffSpecialInformation } from './bluffs'
import { AVAILABLE_OUTSIDER_IDS, OUTSIDER_ID, getGameComposition } from './constants'
import {
  buildRolePool,
  selectDrunkPlayerId,
  selectOutsiders,
  validatePlayers,
} from './game-setup'
import {
  createAssignmentMap,
  getWerewolfPlayers,
  type AssignmentMap,
  toPlayerAssignments,
} from './player-assignments'
import { shuffle, type RandomSource } from './random'
import { ROLE_CATEGORY, ROLE_ID, getRoleDefinition } from './roles'
import {
  buildPetiteFilleInformation,
  buildBibliothecaireInformation,
  buildRenardInformation,
  selectVoyanteDecoyPlayerId,
} from './special-information'
import type { AssignablePlayer, AssignmentResult } from './types'

export function applyLoupBlancPower(
  players: readonly AssignablePlayer[],
  assignments: AssignmentMap,
  selectedOutsiders: readonly string[],
  baseDrunkPlayerId: string | null,
  random: RandomSource,
): string | null {
  const loupBlanc = players.find((player) => assignments.get(player.id) === ROLE_ID.LOUP_BLANC)
  if (!loupBlanc) return baseDrunkPlayerId

  const eligibleVillagers = players.filter((player) => {
    const roleId = assignments.get(player.id)
    return player.id !== loupBlanc.id
      && player.id !== baseDrunkPlayerId
      && roleId !== undefined
      && getRoleDefinition(roleId).category === ROLE_CATEGORY.VILLAGER
  })
  const availableOutsiders = AVAILABLE_OUTSIDER_IDS.filter((roleId) => !selectedOutsiders.includes(roleId))
  if (eligibleVillagers.length < 2 || availableOutsiders.length < 2) {
    throw new Error('Loup Blanc requires two eligible villagers and two distinct outsider roles')
  }

  const selectedPlayers = shuffle(eligibleVillagers, random).slice(0, 2)
  const replacementRoles = shuffle(availableOutsiders, random).slice(0, 2)
  let drunkPlayerId = baseDrunkPlayerId
  selectedPlayers.forEach((player, index) => {
    const replacementRole = replacementRoles[index]
    if (!replacementRole) throw new Error('Loup Blanc replacement role is missing')
    if (replacementRole === OUTSIDER_ID.DRUNK) {
      drunkPlayerId = player.id
      return
    }
    assignments.set(player.id, replacementRole)
  })
  return drunkPlayerId
}

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
  const baseDrunkPlayerId = selectDrunkPlayerId(
    players,
    assignments,
    selectedOutsiders,
    random,
  )
  const drunkPlayerId = applyLoupBlancPower(
    players,
    assignments,
    selectedOutsiders,
    baseDrunkPlayerId,
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
  const bibliothecaireInformation = buildBibliothecaireInformation(
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
    bibliothecaireInformation,
    bluffRoles: bluffRoles.assignments,
    voyanteDecoyPlayerId,
    bluffSpecialInformation,
  }
}
