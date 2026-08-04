import { z } from 'zod'

import { hostDashboardSchema } from './game'
import { privateAssignmentSchema } from './roles'
import { roomSnapshotSchema } from './room'

import {
  PLAYER_COUNT_LIMIT,
  ROLE_CATEGORY,
  type RoleCategory,
} from './constants'
import {
  playerIdSchema,
  playerNameSchema,
  roleIdSchema,
  simulatorGameIdSchema,
  timestampSchema,
} from './identifiers'

const roleCategoryValues = Object.values(ROLE_CATEGORY) as [
  RoleCategory,
  ...RoleCategory[],
]

export const simulatorCreateCommandSchema = z.object({
  playerCount: z.number().int().min(PLAYER_COUNT_LIMIT.MINIMUM).max(PLAYER_COUNT_LIMIT.MAXIMUM),
}).strict()

export const simulatedPlayerSummarySchema = z.object({
  id: playerIdSchema,
  name: playerNameSchema,
  roleId: roleIdSchema,
  effectiveCategory: z.enum(roleCategoryValues),
}).strict()

export const simulatorGameSchema = z.object({
  id: simulatorGameIdSchema,
  players: z.array(simulatedPlayerSummarySchema),
  createdAt: timestampSchema,
}).strict()

export type SimulatorCreateCommand = z.infer<typeof simulatorCreateCommandSchema>
export type SimulatedPlayerSummary = z.infer<typeof simulatedPlayerSummarySchema>
export type SimulatorGame = z.infer<typeof simulatorGameSchema>

export const simulatorScenarioSchema = z.object({
  seed: z.string().min(1).max(120),
  room: roomSnapshotSchema,
  privateAssignments: z.array(privateAssignmentSchema),
  hostDashboard: hostDashboardSchema,
}).strict()

export type SimulatorScenario = z.infer<typeof simulatorScenarioSchema>
