import { z } from 'zod'

import {
  clientRequestIdSchema,
  playerIdSchema,
  playerNameSchema,
  roomIdSchema,
  sessionTokenSchema,
} from './identifiers'

export const emptyCommandSchema = z.object({}).strict()

export const roomEnterCommandSchema = z.object({
  playerName: playerNameSchema,
  clientRequestId: clientRequestIdSchema.optional(),
}).strict()

export const roomCreateCommandSchema = z.object({
  playerName: playerNameSchema,
  clientRequestId: clientRequestIdSchema.optional(),
}).strict()

export const roomJoinCommandSchema = z.object({
  roomId: roomIdSchema,
  playerName: playerNameSchema,
  clientRequestId: clientRequestIdSchema.optional(),
}).strict()

export const sessionResumeCommandSchema = z.object({
  roomId: roomIdSchema.default('main'),
  sessionToken: sessionTokenSchema,
}).strict()

export const hostKickCommandSchema = z.object({
  playerId: playerIdSchema,
}).strict()

export type EmptyCommand = z.infer<typeof emptyCommandSchema>
export type RoomEnterCommand = z.infer<typeof roomEnterCommandSchema>
export type RoomCreateCommand = z.infer<typeof roomCreateCommandSchema>
export type RoomJoinCommand = z.infer<typeof roomJoinCommandSchema>
export type SessionResumeCommand = z.infer<typeof sessionResumeCommandSchema>
export type HostKickCommand = z.infer<typeof hostKickCommandSchema>
