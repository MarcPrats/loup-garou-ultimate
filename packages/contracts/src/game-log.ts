import { z } from 'zod'

import { GAME_LOG_EVENT_TYPE } from './constants'
import { gamePhaseSchema } from './game-phase'
import {
  playerIdSchema,
  playerNameSchema,
  revisionSchema,
} from './identifiers'

export type GameLogEventType = typeof GAME_LOG_EVENT_TYPE[keyof typeof GAME_LOG_EVENT_TYPE]

const gameLogEventTypeValues = Object.values(GAME_LOG_EVENT_TYPE) as [
  GameLogEventType,
  ...GameLogEventType[],
]

export const gameLogEventTypeSchema = z.enum(gameLogEventTypeValues)

export const gameVoteLogDetailsSchema = z.object({
  nominationId: z.string().min(1),
  nominatorName: playerNameSchema,
  targetName: playerNameSchema,
  yesVoterNames: z.array(playerNameSchema),
  noVoterNames: z.array(playerNameSchema),
  threshold: z.number().int().positive(),
  passed: z.boolean(),
}).strict()

export const gameLogEntrySchema = z.object({
  id: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  eventType: gameLogEventTypeSchema,
  phase: gamePhaseSchema,
  targetPlayerId: playerIdSchema,
  targetPlayerName: playerNameSchema,
  voteDetails: gameVoteLogDetailsSchema.optional(),
}).strict()

export type GameLogEntry = z.infer<typeof gameLogEntrySchema>
export type GameVoteLogDetails = z.infer<typeof gameVoteLogDetailsSchema>

export const gameLogRecordCommandSchema = z.object({
  expectedRevision: revisionSchema,
  eventType: gameLogEventTypeSchema,
  targetPlayerId: playerIdSchema,
}).strict()

export const gameLogEditCommandSchema = z.object({
  expectedRevision: revisionSchema,
  eventId: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  targetPlayerId: playerIdSchema,
}).strict()

export const gameLogDeleteCommandSchema = z.object({
  expectedRevision: revisionSchema,
  eventId: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
}).strict()

export type GameLogRecordCommand = z.infer<typeof gameLogRecordCommandSchema>
export type GameLogEditCommand = z.infer<typeof gameLogEditCommandSchema>
export type GameLogDeleteCommand = z.infer<typeof gameLogDeleteCommandSchema>
