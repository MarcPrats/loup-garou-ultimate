import { z } from 'zod'

import { APPLICATION, ROLE_ACCESS_VIEW } from './constants'
import { hostDashboardSchema } from './game'
import { privateAssignmentSchema } from './roles'

export const healthResponseSchema = z.object({
  app: z.literal(APPLICATION.ID),
  version: z.string().min(1),
  status: z.literal('ok'),
}).strict()

export const roleAccessResponseSchema = z.discriminatedUnion('view', [
  z.object({
    view: z.literal(ROLE_ACCESS_VIEW.PLAYER),
    assignment: privateAssignmentSchema,
  }).strict(),
  z.object({
    view: z.literal(ROLE_ACCESS_VIEW.GAME_MASTER),
    dashboard: hostDashboardSchema,
  }).strict(),
])

export type HealthResponse = z.infer<typeof healthResponseSchema>
export type RoleAccessResponse = z.infer<typeof roleAccessResponseSchema>
