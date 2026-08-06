import type {
  HostDashboard,
  PlayerId,
  PrivateAssignment,
  RoleAccessResponse,
} from '@lgu/contracts'
import {
  projectHostDashboard,
  projectPrivateAssignment,
  projectRoleAccessResponse,
  type GameProjectionState,
} from '@lgu/game-projection'

import type {
  LobbyState,
  RoleAccessGrant,
} from '../domain/lobby-types'

function toProjectionState(lobby: LobbyState): GameProjectionState {
  if (!lobby.game) throw new Error('Started lobby has no stored game state')
  return {
    players: lobby.players,
    assignment: lobby.game.assignment,
    roleAccessGrants: lobby.game.roleAccessGrants,
  }
}

export function toPrivateAssignment(
  lobby: LobbyState,
  playerId: PlayerId,
): PrivateAssignment {
  return projectPrivateAssignment(toProjectionState(lobby), playerId)
}

export function toHostDashboard(lobby: LobbyState): HostDashboard {
  return projectHostDashboard(toProjectionState(lobby))
}

export function toRoleAccessResponse(
  lobby: LobbyState,
  grant: RoleAccessGrant,
): RoleAccessResponse {
  return projectRoleAccessResponse(toProjectionState(lobby), grant)
}
