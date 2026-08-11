import type {
  GameStartPreview,
  HostDashboard,
  PlayerId,
  PrivateAssignment,
  RoleAccessResponse,
} from '@lgu/contracts'
import {
  projectHostDashboard,
  projectGameStartPreview,
  projectLoupBlancDashboard,
  projectPrivateAssignment,
  projectRoleAccessResponse,
  type GameProjectionState,
} from '@lgu/game-projection'

import type {
  GameStartPreviewState,
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

export function toGameStartPreview(
  lobby: LobbyState,
  assignment: GameStartPreviewState['assignment'],
): GameStartPreview {
  return projectGameStartPreview({
    players: lobby.players,
    assignment,
    roleAccessGrants: [],
  })
}

export function toLoupBlancDashboard(
  lobby: LobbyState,
  playerId: PlayerId,
): HostDashboard {
  return projectLoupBlancDashboard(toProjectionState(lobby), playerId)
}

export function toRoleAccessResponse(
  lobby: LobbyState,
  grant: RoleAccessGrant,
): RoleAccessResponse {
  return projectRoleAccessResponse(toProjectionState(lobby), grant)
}
