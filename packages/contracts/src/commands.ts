import { z } from 'zod'

import {
  playerIdSchema,
  playerNameSchema,
  sessionTokenSchema,
} from './identifiers'

export const emptyCommandSchema = z.object({}).strict()

export const roomEnterCommandSchema = z.object({
  playerName: playerNameSchema,
}).strict()

export const sessionResumeCommandSchema = z.object({
  sessionToken: sessionTokenSchema,
}).strict()

export const hostKickCommandSchema = z.object({
  playerId: playerIdSchema,
}).strict()

export type EmptyCommand = z.infer<typeof emptyCommandSchema>
export type RoomEnterCommand = z.infer<typeof roomEnterCommandSchema>
export type SessionResumeCommand = z.infer<typeof sessionResumeCommandSchema>
export type HostKickCommand = z.infer<typeof hostKickCommandSchema>
