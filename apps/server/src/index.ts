import cors from '@fastify/cors'
import Fastify from 'fastify'
import { Server as SocketIoServer } from 'socket.io'

import {
  API_ROUTE,
  APPLICATION,
  SOCKET_EVENT,
  healthResponseSchema,
  systemReadyEventSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@lgu/contracts'

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: webOrigin,
})

app.get(API_ROUTE.HEALTH, async () => healthResponseSchema.parse({
  app: APPLICATION.ID,
  version: APPLICATION.VERSION,
  status: 'ok',
}))

const io = new SocketIoServer<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: {
    origin: webOrigin,
  },
})

io.on('connection', (socket) => {
  const event = systemReadyEventSchema.parse({
    message: 'Le serveur temps réel V3 est connecté.',
  })

  socket.emit(SOCKET_EVENT.SYSTEM_READY, event)
})

await app.listen({ port, host })
