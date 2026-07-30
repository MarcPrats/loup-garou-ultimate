import { io, type Socket } from 'socket.io-client'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@lgu/contracts'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: GameSocket | undefined

export function getSocket(): GameSocket {
  socket ??= io({
    autoConnect: false,
    transports: ['websocket', 'polling'],
  })

  return socket
}
