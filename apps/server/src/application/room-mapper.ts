import {
  ROOM_PHASE,
  SESSION_DESTINATION,
  type RoomSnapshot,
  type SessionDestination,
} from '@lgu/contracts'
import { PLAYER_COUNT } from '@lgu/game-core'

import type {
  LobbyPlayerState,
  LobbyRoomState,
} from '../domain/lobby-types'

export function getConnectedRegularPlayers(
  room: LobbyRoomState,
): LobbyPlayerState[] {
  return room.players.filter((player) => player.connected && !player.isHost)
}

export function getRegularPlayerCount(room: LobbyRoomState): number {
  return room.players.filter((player) => !player.isHost).length
}

export function canStartRoom(room: LobbyRoomState): boolean {
  if (room.phase !== ROOM_PHASE.LOBBY) return false
  if (room.players.some((player) => !player.connected)) return false

  const connectedHosts = room.players.filter(
    (player) => player.connected && player.isHost,
  )
  const regularPlayerCount = getConnectedRegularPlayers(room).length

  return connectedHosts.length === 1
    && regularPlayerCount >= PLAYER_COUNT.MINIMUM
    && regularPlayerCount <= PLAYER_COUNT.MAXIMUM
}

export function getSessionDestination(
  room: LobbyRoomState,
  player: LobbyPlayerState,
): SessionDestination {
  if (room.phase === ROOM_PHASE.LOBBY) return SESSION_DESTINATION.LOBBY
  return player.isHost
    ? SESSION_DESTINATION.GAME_MASTER
    : SESSION_DESTINATION.PLAYER_ROLE
}

export function toRoomSnapshot(room: LobbyRoomState): RoomSnapshot {
  return {
    id: room.id,
    phase: room.phase,
    revision: room.revision,
    players: [...room.players]
      .sort((left, right) => left.joinOrder - right.joinOrder)
      .map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        connected: player.connected,
      })),
    minimumPlayers: PLAYER_COUNT.MINIMUM,
    maximumPlayers: PLAYER_COUNT.MAXIMUM,
    canStart: canStartRoom(room),
    createdAt: room.createdAt,
  }
}
