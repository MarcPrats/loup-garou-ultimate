import {
  LOBBY_PHASE,
  SESSION_DESTINATION,
  type LobbySnapshot,
  type SessionDestination,
} from '@lgu/contracts'
import { PLAYER_COUNT } from '@lgu/game-core'

import type {
  LobbyPlayerState,
  LobbyState,
} from '../domain/lobby-types'

export function getConnectedRegularPlayers(
  lobby: LobbyState,
): LobbyPlayerState[] {
  return lobby.players.filter((player) => player.connected && !player.isHost)
}

export function getRegularPlayerCount(lobby: LobbyState): number {
  return lobby.players.filter((player) => !player.isHost).length
}

export function canStartLobby(lobby: LobbyState): boolean {
  if (lobby.phase !== LOBBY_PHASE.LOBBY) return false
  if (lobby.players.some((player) => !player.connected)) return false

  const connectedHosts = lobby.players.filter(
    (player) => player.connected && player.isHost,
  )
  const regularPlayerCount = getConnectedRegularPlayers(lobby).length

  return connectedHosts.length === 1
    && regularPlayerCount >= PLAYER_COUNT.MINIMUM
    && regularPlayerCount <= PLAYER_COUNT.MAXIMUM
}

export function getSessionDestination(
  lobby: LobbyState,
  player: LobbyPlayerState,
): SessionDestination {
  if (lobby.phase === LOBBY_PHASE.LOBBY) return SESSION_DESTINATION.LOBBY
  return player.isHost
    ? SESSION_DESTINATION.GAME_MASTER
    : SESSION_DESTINATION.PLAYER_ROLE
}

function getDeadPlayerIds(lobby: LobbyState): ReadonlySet<string> {
  return new Set(lobby.game?.gameLog.map((event) => event.targetPlayerId) ?? [])
}

export function toLobbySnapshot(lobby: LobbyState): LobbySnapshot {
  const deadPlayerIds = getDeadPlayerIds(lobby)

  return {
    id: lobby.id,
    phase: lobby.phase,
    gamePhase: lobby.gamePhase,
    gameLog: lobby.game?.gameLog ?? [],
    revision: lobby.revision,
    players: [...lobby.players]
      .sort((left, right) => left.joinOrder - right.joinOrder)
      .map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        connected: player.connected,
        alive: player.isHost || !deadPlayerIds.has(player.id),
      })),
    minimumPlayers: PLAYER_COUNT.MINIMUM,
    maximumPlayers: PLAYER_COUNT.MAXIMUM,
    canStart: canStartLobby(lobby),
    createdAt: lobby.createdAt,
  }
}
