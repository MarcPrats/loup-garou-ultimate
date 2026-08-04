import {
  ROLE_ACCESS_VIEW,
  SPECIAL_INFORMATION_TYPE,
  hostDashboardSchema,
  privateAssignmentSchema,
  roleAccessResponseSchema,
  type HostDashboard,
  type PrivateAssignment,
  type RoleAccessResponse,
  type RoleSummary,
  type SpecialInformation,
} from '@lgu/contracts'
import {
  TEAM,
  getRoleDefinition,
  type AssignmentResult,
  type PlayerAssignment,
  type RoleId,
} from '@lgu/game-core'

import type {
  LobbyPlayerState,
  LobbyRoomState,
  RoleAccessGrant,
  StoredGameState,
} from '../domain/lobby-types'

interface CoreSpecialInformation {
  readonly type: typeof SPECIAL_INFORMATION_TYPE.RENARD
    | typeof SPECIAL_INFORMATION_TYPE.PETITE_FILLE
  readonly roleId: RoleId
  readonly seenPlayerIds: readonly [string, string]
}

function requireGame(room: LobbyRoomState): StoredGameState {
  if (!room.game) throw new Error('Started room has no stored game state')
  return room.game
}

function requirePlayer(
  room: LobbyRoomState,
  playerId: string,
): LobbyPlayerState {
  const player = room.players.find((candidate) => candidate.id === playerId)
  if (!player) throw new Error(`Unknown room player: ${playerId}`)
  return player
}

function requireAssignment(
  assignment: AssignmentResult,
  playerId: string,
): PlayerAssignment {
  const playerAssignment = assignment.assignments.find(
    (candidate) => candidate.playerId === playerId,
  )
  if (!playerAssignment) {
    throw new Error(`No role assignment for player: ${playerId}`)
  }
  return playerAssignment
}

function toRoleSummary(roleId: RoleId): RoleSummary {
  const role = getRoleDefinition(roleId)
  return { id: role.id, team: role.team, category: role.category }
}

function getSpecialInformation(
  assignment: AssignmentResult,
  playerId: string,
): CoreSpecialInformation | null {
  if (assignment.renardInformation?.playerId === playerId) {
    return {
      type: SPECIAL_INFORMATION_TYPE.RENARD,
      roleId: assignment.renardInformation.roleId,
      seenPlayerIds: assignment.renardInformation.seenPlayerIds,
    }
  }
  if (assignment.petiteFilleInformation?.playerId === playerId) {
    return {
      type: SPECIAL_INFORMATION_TYPE.PETITE_FILLE,
      roleId: assignment.petiteFilleInformation.roleId,
      seenPlayerIds: assignment.petiteFilleInformation.seenPlayerIds,
    }
  }

  const bluff = assignment.bluffSpecialInformation.find(
    (information) => information.playerId === playerId,
  )
  return bluff
    ? {
        type: bluff.type,
        roleId: bluff.roleId,
        seenPlayerIds: bluff.seenPlayerIds,
      }
    : null
}

function toSpecialInformation(
  room: LobbyRoomState,
  information: CoreSpecialInformation | null,
): SpecialInformation | null {
  if (!information) return null

  return {
    type: information.type,
    roleId: information.roleId,
    players: information.seenPlayerIds.map((playerId) => {
      const player = requirePlayer(room, playerId)
      return { id: player.id, name: player.name }
    }) as [
      { id: string; name: string },
      { id: string; name: string },
    ],
  }
}

function findGrant(
  game: StoredGameState,
  playerId: string,
): RoleAccessGrant {
  const grant = game.roleAccessGrants.find(
    (candidate) => candidate.playerId === playerId,
  )
  if (!grant) throw new Error(`No role access grant for player: ${playerId}`)
  return grant
}

function getBluffRoleId(
  assignment: AssignmentResult,
  playerId: string,
): RoleId | null {
  return assignment.bluffRoles.find((bluff) => bluff.playerId === playerId)
    ?.roleId ?? null
}

export function toPrivateAssignment(
  room: LobbyRoomState,
  playerId: string,
): PrivateAssignment {
  const game = requireGame(room)
  const player = requirePlayer(room, playerId)
  const assignment = requireAssignment(game.assignment, playerId)
  const grant = findGrant(game, playerId)
  if (grant.view !== ROLE_ACCESS_VIEW.PLAYER) {
    throw new Error(`Player assignment requested with ${grant.view} grant`)
  }

  return privateAssignmentSchema.parse({
    player: { id: player.id, name: player.name },
    role: toRoleSummary(assignment.roleId),
    roleAccessToken: grant.token,
    bluffRoleId: getBluffRoleId(game.assignment, playerId),
    specialInformation: toSpecialInformation(
      room,
      getSpecialInformation(game.assignment, playerId),
    ),
  })
}

export function toHostDashboard(room: LobbyRoomState): HostDashboard {
  const game = requireGame(room)
  const host = room.players.find((player) => player.isHost)
  if (!host) throw new Error('Started room has no game master')
  const hostGrant = findGrant(game, host.id)
  if (hostGrant.view !== ROLE_ACCESS_VIEW.GAME_MASTER) {
    throw new Error('Game master has an invalid role access grant')
  }
  const players = game.assignment.assignments.map((assignment) => {
    const player = requirePlayer(room, assignment.playerId)
    return {
      player: {
        id: player.id,
        name: player.name,
        connected: player.connected,
      },
      role: toRoleSummary(assignment.roleId),
      isDrunk: assignment.isDrunk,
      isVoyanteDecoy:
        game.assignment.voyanteDecoyPlayerId === assignment.playerId,
      bluffRoleId: getBluffRoleId(game.assignment, assignment.playerId),
      specialInformation: toSpecialInformation(
        room,
        getSpecialInformation(game.assignment, assignment.playerId),
      ),
    }
  })

  return hostDashboardSchema.parse({
    roleAccessToken: hostGrant.token,
    players,
    playerCount: players.length,
    werewolfCount: players.filter(
      (player) => player.role.team === TEAM.WEREWOLVES,
    ).length,
    villagerTeamCount: players.filter(
      (player) => player.role.team === TEAM.VILLAGERS,
    ).length,
  })
}

export function toRoleAccessResponse(
  room: LobbyRoomState,
  grant: RoleAccessGrant,
): RoleAccessResponse {
  return roleAccessResponseSchema.parse(
    grant.view === ROLE_ACCESS_VIEW.GAME_MASTER
      ? { view: grant.view, dashboard: toHostDashboard(room) }
      : {
          view: grant.view,
          assignment: toPrivateAssignment(room, grant.playerId),
        },
  )
}
