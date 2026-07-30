import { z } from 'zod'

import { APPLICATION } from './constants'
import { hostDashboardSchema } from './game'
import { privateAssignmentSchema } from './roles'

export const healthResponseSchema = z.object({
  app: z.literal(APPLICATION.ID),
  version: z.string().min(1),
  status: z.literal('ok'),
}).strict()

export const roleAccessResponseSchema = z.discriminatedUnion('view', [
  z.object({
    view: z.literal('player'),
    assignment: privateAssignmentSchema,
  }).strict(),
  z.object({
    view: z.literal('game-master'),
    dashboard: hostDashboardSchema,
  }).strict(),
])

export type HealthResponse = z.infer<typeof healthResponseSchema>
export type RoleAccessResponse = z.infer<typeof roleAccessResponseSchema>
