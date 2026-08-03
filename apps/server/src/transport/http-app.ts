import cors from '@fastify/cors'
import Fastify, { LogController, type FastifyInstance } from 'fastify'

import {
  API_ROUTE,
  APPLICATION,
  healthResponseSchema,
  publicErrorSchema,
  roleAccessResponseSchema,
} from '@lgu/contracts'

import type { LobbyService } from '../application/lobby-service'
import {
  getHttpStatus,
  toPublicError,
} from '../application/public-error-mapper'

export interface HttpAppOptions {
  readonly service: LobbyService
  readonly webOrigin: string
  readonly logger?: boolean
}

export function createHttpApp(options: HttpAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    logController: new LogController({ disableRequestLogging: true }),
  })

  void app.register(cors, { origin: options.webOrigin })

  app.get(API_ROUTE.HEALTH, async () => healthResponseSchema.parse({
    app: APPLICATION.ID,
    version: APPLICATION.VERSION,
    status: 'ok',
  }))

  app.get<{ Params: { token: string } }>(
    `${API_ROUTE.ROLE_ACCESS_PREFIX}/:token`,
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store')
      reply.header('Referrer-Policy', 'no-referrer')
      try {
        return roleAccessResponseSchema.parse(
          await options.service.accessRole(request.params.token),
        )
      } catch (error) {
        const publicError = publicErrorSchema.parse(toPublicError(error))
        return reply.code(getHttpStatus(publicError)).send(publicError)
      }
    },
  )

  return app
}
