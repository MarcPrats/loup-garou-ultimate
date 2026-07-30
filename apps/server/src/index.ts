import cors from '@fastify/cors'
import Fastify from 'fastify'
import { Server as SocketIoServer } from 'socket.io'

import type {
  ClientToServerEvents,
  HealthResponse,
  ServerToClientEvents,
  SystemReadyEvent,
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

app.get('/api/health', async (): Promise<HealthResponse> => ({
  app: 'loup-garou-ultimate',
  version: '3.0.0-dev',
  status: 'ok',
}))

const io = new SocketIoServer<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: {
    origin: webOrigin,
  },
})

io.on('connection', (socket) => {
  const event: SystemReadyEvent = {
    message: 'Le serveur temps réel V3 est connecté.',
  }

  socket.emit('system:ready', event)
})

await app.listen({ port, host })
