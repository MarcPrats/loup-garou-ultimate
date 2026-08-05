import { shuffle, type RandomSource } from './random'
import {
  isWerewolfRole,
  type RoleId,
} from './roles'
import type {
  AssignablePlayer,
  PlayerAssignment,
  PlayerId,
} from './types'

export type AssignmentMap = Map<PlayerId, RoleId>

export function createAssignmentMap(
  players: readonly AssignablePlayer[],
  rolePool: readonly RoleId[],
  random: RandomSource,
): AssignmentMap {
  const finalRoles = shuffle(rolePool, random)
  const assignments = new Map<PlayerId, RoleId>()

  players.forEach((player, index) => {
    const roleId = finalRoles[index]
    if (!roleId) throw new Error(`No role available for player ${player.id}`)
    assignments.set(player.id, roleId)
  })

  return assignments
}

export function roleFor(
  assignments: ReadonlyMap<PlayerId, RoleId>,
  playerId: PlayerId,
): RoleId {
  const roleId = assignments.get(playerId)
  if (!roleId) throw new Error(`Player ${playerId} has no assigned role`)
  return roleId
}

export function findPlayerWithRole(
  players: readonly AssignablePlayer[],
  assignments: ReadonlyMap<PlayerId, RoleId>,
  expectedRoleId: RoleId,
): AssignablePlayer | undefined {
  return players.find(
    (player) => roleFor(assignments, player.id) === expectedRoleId,
  )
}

export function getWerewolfPlayers(
  players: readonly AssignablePlayer[],
  assignments: ReadonlyMap<PlayerId, RoleId>,
): AssignablePlayer[] {
  return players.filter((player) =>
    isWerewolfRole(roleFor(assignments, player.id)),
  )
}

export function toPlayerAssignments(
  players: readonly AssignablePlayer[],
  assignments: ReadonlyMap<PlayerId, RoleId>,
  drunkPlayerId: PlayerId | null,
): PlayerAssignment[] {
  return players.map((player) => ({
    playerId: player.id,
    roleId: roleFor(assignments, player.id),
    isDrunk: player.id === drunkPlayerId,
  }))
}
