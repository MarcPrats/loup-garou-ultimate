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
  LobbyRoomState,
  RoleAccessGrant,
} from '../domain/lobby-types'

function toProjectionState(room: LobbyRoomState): GameProjectionState {
  if (!room.game) throw new Error('Started room has no stored game state')
  return {
    players: room.players,
    assignment: room.game.assignment,
    roleAccessGrants: room.game.roleAccessGrants,
  }
}

export function toPrivateAssignment(
  room: LobbyRoomState,
  playerId: PlayerId,
): PrivateAssignment {
  return projectPrivateAssignment(toProjectionState(room), playerId)
}

export function toHostDashboard(room: LobbyRoomState): HostDashboard {
  return projectHostDashboard(toProjectionState(room))
}

export function toRoleAccessResponse(
  room: LobbyRoomState,
  grant: RoleAccessGrant,
): RoleAccessResponse {
  return projectRoleAccessResponse(toProjectionState(room), grant)
}
