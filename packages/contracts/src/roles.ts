import { z } from 'zod'

import {
  ROLE_CATEGORY,
  SPECIAL_INFORMATION_TYPE,
  TEAM,
  type RoleCategory,
  type SpecialInformationType,
  type Team,
} from './constants'
import {
  playerIdSchema,
  playerNameSchema,
  roleAccessTokenSchema,
  roleIdSchema,
} from './identifiers'

const teamValues = Object.values(TEAM) as [Team, ...Team[]]
const roleCategoryValues = Object.values(ROLE_CATEGORY) as [RoleCategory, ...RoleCategory[]]
const specialInformationTypeValues = Object.values(SPECIAL_INFORMATION_TYPE) as [
  SpecialInformationType,
  ...SpecialInformationType[],
]

export const teamSchema = z.enum(teamValues)
export const roleCategorySchema = z.enum(roleCategoryValues)
export const specialInformationTypeSchema = z.enum(specialInformationTypeValues)

export const roleSummarySchema = z.object({
  id: roleIdSchema,
  team: teamSchema,
  category: roleCategorySchema,
}).strict()

export const cluePlayerSchema = z.object({
  id: playerIdSchema,
  name: playerNameSchema,
}).strict()

export const specialInformationSchema = z.object({
  type: specialInformationTypeSchema,
  roleId: roleIdSchema,
  players: z.tuple([cluePlayerSchema, cluePlayerSchema]),
}).strict()

export const privateAssignmentSchema = z.object({
  player: cluePlayerSchema,
  role: roleSummarySchema,
  roleAccessToken: roleAccessTokenSchema,
  bluffRoleId: roleIdSchema.nullable(),
  specialInformation: specialInformationSchema.nullable(),
}).strict()

export const hostPlayerAssignmentSchema = z.object({
  player: cluePlayerSchema.extend({
    connected: z.boolean(),
  }).strict(),
  role: roleSummarySchema,
  isDrunk: z.boolean(),
  isVoyanteDecoy: z.boolean(),
  bluffRoleId: roleIdSchema.nullable(),
  specialInformation: specialInformationSchema.nullable(),
}).strict()

export type RoleSummary = z.infer<typeof roleSummarySchema>
export type CluePlayer = z.infer<typeof cluePlayerSchema>
export type SpecialInformation = z.infer<typeof specialInformationSchema>
export type PrivateAssignment = z.infer<typeof privateAssignmentSchema>
export type HostPlayerAssignment = z.infer<typeof hostPlayerAssignmentSchema>
