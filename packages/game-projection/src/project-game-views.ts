import {
  ROLE_ACCESS_VIEW,
  SPECIAL_INFORMATION_TYPE,
  gameStartPreviewSchema,
  hostDashboardSchema,
  privateAssignmentSchema,
  roleAccessResponseSchema,
  type HostDashboard,
  type GameStartPreview,
  type PlayerId,
  type PrivateAssignment,
  type RoleAccessResponse,
  type RoleSummary,
  type SpecialInformation,
} from '@lgu/contracts'
import {
  TEAM,
  getRoleDefinition,
  ROLE_ID,
  type AssignmentResult,
  type PlayerAssignment,
  type RoleId,
} from '@lgu/game-core'

import type {
  GameProjectionState,
  ProjectionPlayer,
  ProjectionRoleAccessGrant,
} from './types'

interface CoreSpecialInformation {
  readonly type: typeof SPECIAL_INFORMATION_TYPE.RENARD
    | typeof SPECIAL_INFORMATION_TYPE.PETITE_FILLE
  readonly roleId: RoleId
  readonly seenPlayerIds: readonly [string, string]
}

function requirePlayer(
  state: GameProjectionState,
  playerId: string,
): ProjectionPlayer {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) throw new Error(`Unknown projected player: ${playerId}`)
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

function requireGrant(
  state: GameProjectionState,
  playerId: string,
): ProjectionRoleAccessGrant {
  const grant = state.roleAccessGrants.find(
    (candidate) => candidate.playerId === playerId,
  )
  if (!grant) throw new Error(`No role access grant for player: ${playerId}`)
  return grant
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
  state: GameProjectionState,
  information: CoreSpecialInformation | null,
): SpecialInformation | null {
  if (!information) return null

  return {
    type: information.type,
    roleId: information.roleId,
    players: information.seenPlayerIds.map((playerId) => {
      const player = requirePlayer(state, playerId)
      return { id: player.id, name: player.name }
    }) as [
      { id: string; name: string },
      { id: string; name: string },
    ],
  }
}

function getBluffRoleId(
  assignment: AssignmentResult,
  playerId: string,
): RoleId | null {
  return assignment.bluffRoles.find((bluff) => bluff.playerId === playerId)
    ?.roleId ?? null
}

export function projectPrivateAssignment(
  state: GameProjectionState,
  playerId: PlayerId,
): PrivateAssignment {
  const player = requirePlayer(state, playerId)
  const assignment = requireAssignment(state.assignment, playerId)
  const grant = requireGrant(state, playerId)
  if (grant.view !== ROLE_ACCESS_VIEW.PLAYER) {
    throw new Error(`Player assignment requested with ${grant.view} grant`)
  }

  return privateAssignmentSchema.parse({
    player: { id: player.id, name: player.name },
    role: toRoleSummary(assignment.roleId),
    roleAccessToken: grant.token,
    bluffRoleId: getBluffRoleId(state.assignment, playerId),
    specialInformation: toSpecialInformation(
      state,
      getSpecialInformation(state.assignment, playerId),
    ),
  })
}

function projectDashboardData(state: GameProjectionState) {
  const players = state.assignment.assignments.map((assignment) => {
    const player = requirePlayer(state, assignment.playerId)
    return {
      player: {
        id: player.id,
        name: player.name,
        connected: player.connected,
      },
      role: toRoleSummary(assignment.roleId),
      isDrunk: assignment.isDrunk,
      isVoyanteDecoy:
        state.assignment.voyanteDecoyPlayerId === assignment.playerId,
      bluffRoleId: getBluffRoleId(state.assignment, assignment.playerId),
      specialInformation: toSpecialInformation(
        state,
        getSpecialInformation(state.assignment, assignment.playerId),
      ),
    }
  })

  return {
    players,
    playerCount: players.length,
    werewolfCount: players.filter(
      (player) => player.role.team === TEAM.WEREWOLVES,
    ).length,
    villagerTeamCount: players.filter(
      (player) => player.role.team === TEAM.VILLAGERS,
    ).length,
  }
}

function projectDashboardForGrant(
  state: GameProjectionState,
  grant: ProjectionRoleAccessGrant,
): HostDashboard {
  return hostDashboardSchema.parse({
    ...projectDashboardData(state),
    roleAccessToken: grant.token,
  })
}

export function projectGameStartPreview(
  state: GameProjectionState,
): GameStartPreview {
  return gameStartPreviewSchema.parse(projectDashboardData(state))
}

export function projectHostDashboard(
  state: GameProjectionState,
): HostDashboard {
  const host = state.players.find((player) => player.isHost)
  if (!host) throw new Error('Projected game has no game master')
  const hostGrant = requireGrant(state, host.id)
  if (hostGrant.view !== ROLE_ACCESS_VIEW.GAME_MASTER) {
    throw new Error('Game master has an invalid role access grant')
  }
  return projectDashboardForGrant(state, hostGrant)
}

export function projectLoupBlancDashboard(
  state: GameProjectionState,
  playerId: string,
): HostDashboard {
  const assignment = requireAssignment(state.assignment, playerId)
  if (assignment.roleId !== ROLE_ID.LOUP_BLANC) {
    throw new Error('Dashboard requested by a player without Loup Blanc access')
  }
  const grant = requireGrant(state, playerId)
  if (grant.view !== ROLE_ACCESS_VIEW.PLAYER) {
    throw new Error('Loup Blanc has an invalid role access grant')
  }
  return projectDashboardForGrant(state, grant)
}

export function projectRoleAccessResponse(
  state: GameProjectionState,
  grant: ProjectionRoleAccessGrant,
): RoleAccessResponse {
  return roleAccessResponseSchema.parse(
    grant.view === ROLE_ACCESS_VIEW.GAME_MASTER
      ? { view: grant.view, dashboard: projectHostDashboard(state) }
      : {
          view: grant.view,
          assignment: projectPrivateAssignment(state, grant.playerId),
        },
  )
}
