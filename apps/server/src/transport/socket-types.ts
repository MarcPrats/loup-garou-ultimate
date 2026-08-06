import type { Server, Socket } from 'socket.io'

import type {
  ClientToServerEvents,
  PlayerId,
  LobbyId,
  ServerToClientEvents,
  SessionToken,
} from '@lgu/contracts'

export interface InterServerEvents {}

export interface AuthenticatedSocketData {
  lobbyId?: LobbyId
  playerId?: PlayerId
  sessionToken?: SessionToken
}

export type GameSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AuthenticatedSocketData
>

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AuthenticatedSocketData
>
