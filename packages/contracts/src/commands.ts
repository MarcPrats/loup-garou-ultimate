import { z } from 'zod'

import {
  dayNominationDecisionCommandSchema,
  dayNominationProposeCommandSchema,
  dayVoteSubmitCommandSchema,
} from './day-voting'

import { LOBBY_ID } from './constants'

import {
  clientRequestIdSchema,
  playerIdSchema,
  playerNameSchema,
  revisionSchema,
  lobbyIdSchema,
  sessionTokenSchema,
} from './identifiers'

export const emptyCommandSchema = z.object({}).strict()

export const lobbyEnterCommandSchema = z.object({
  playerName: playerNameSchema,
  clientRequestId: clientRequestIdSchema.optional(),
}).strict()

export const lobbyCreateCommandSchema = z.object({
  playerName: playerNameSchema,
  clientRequestId: clientRequestIdSchema.optional(),
}).strict()

export const lobbyJoinCommandSchema = z.object({
  lobbyId: lobbyIdSchema,
  playerName: playerNameSchema,
  clientRequestId: clientRequestIdSchema.optional(),
}).strict()

export const sessionResumeCommandSchema = z.object({
  lobbyId: lobbyIdSchema.default(LOBBY_ID.MAIN),
  sessionToken: sessionTokenSchema,
}).strict()

export const hostKickCommandSchema = z.object({
  playerId: playerIdSchema,
}).strict()

export const gamePhaseAdvanceCommandSchema = z.object({
  expectedRevision: revisionSchema,
}).strict()

export type EmptyCommand = z.infer<typeof emptyCommandSchema>
export type LobbyEnterCommand = z.infer<typeof lobbyEnterCommandSchema>
export type LobbyCreateCommand = z.infer<typeof lobbyCreateCommandSchema>
export type LobbyJoinCommand = z.infer<typeof lobbyJoinCommandSchema>
export type SessionResumeCommand = z.infer<typeof sessionResumeCommandSchema>
export type HostKickCommand = z.infer<typeof hostKickCommandSchema>
export type GamePhaseAdvanceCommand = z.infer<typeof gamePhaseAdvanceCommandSchema>
export {
  dayNominationDecisionCommandSchema,
  dayNominationProposeCommandSchema,
  dayVoteSubmitCommandSchema,
}
export type {
  DayNominationDecisionCommand,
  DayNominationProposeCommand,
  DayVoteSubmitCommand,
} from './day-voting'
