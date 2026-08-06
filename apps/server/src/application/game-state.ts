import {
  ROLE_ACCESS_VIEW,
  roleAccessTokenSchema,
} from '@lgu/contracts'

import type {
  GameAssignmentGenerator,
  LobbyPlayerState,
  LobbyState,
  RoleAccessGrant,
  StoredGameState,
  ValueGenerator,
} from '../domain/lobby-types'

const ROLE_ACCESS_TOKEN_MAX_ATTEMPTS = 5

function getPlayersInJoinOrder(lobby: LobbyState): LobbyPlayerState[] {
  return [...lobby.players].sort(
    (left, right) => left.joinOrder - right.joinOrder,
  )
}

function createUniqueRoleAccessToken(
  generator: ValueGenerator,
  usedTokens: Set<string>,
): string {
  for (let attempt = 0; attempt < ROLE_ACCESS_TOKEN_MAX_ATTEMPTS; attempt += 1) {
    const token = roleAccessTokenSchema.parse(generator.next())
    if (!usedTokens.has(token)) {
      usedTokens.add(token)
      return token
    }
  }

  throw new Error('Unable to generate a unique role access token')
}

function createRoleAccessGrants(
  players: readonly LobbyPlayerState[],
  generator: ValueGenerator,
): RoleAccessGrant[] {
  const usedTokens = new Set<string>()
  return players.map((player) => ({
    playerId: player.id,
    token: createUniqueRoleAccessToken(generator, usedTokens),
    view: player.isHost
      ? ROLE_ACCESS_VIEW.GAME_MASTER
      : ROLE_ACCESS_VIEW.PLAYER,
  }))
}

export function createStoredGameState(
  lobby: LobbyState,
  assignmentGenerator: GameAssignmentGenerator,
  roleAccessTokenGenerator: ValueGenerator,
  startedAt: number,
): StoredGameState {
  const players = getPlayersInJoinOrder(lobby)
  const assignablePlayers = players
    .filter((player) => !player.isHost)
    .map((player) => ({ id: player.id, name: player.name }))

  return {
    assignment: assignmentGenerator.assign(assignablePlayers),
    roleAccessGrants: createRoleAccessGrants(
      players,
      roleAccessTokenGenerator,
    ),
    startedAt,
  }
}
