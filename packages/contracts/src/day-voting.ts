import { z } from 'zod'

import { playerIdSchema, playerNameSchema, revisionSchema, timestampSchema } from './identifiers'

export const DAY_VOTE_CHOICE = {
  YES: 'yes',
  NO: 'no',
} as const
export type DayVoteChoice = typeof DAY_VOTE_CHOICE[keyof typeof DAY_VOTE_CHOICE]

export const DAY_VOTE_STATUS = {
  IDLE: 'idle',
  NOMINATION_PENDING: 'nomination-pending',
  ACTIVE: 'active',
  RESOLVED: 'resolved',
} as const
export type DayVoteStatus = typeof DAY_VOTE_STATUS[keyof typeof DAY_VOTE_STATUS]

const choiceValues = Object.values(DAY_VOTE_CHOICE) as [DayVoteChoice, ...DayVoteChoice[]]
const statusValues = Object.values(DAY_VOTE_STATUS) as [DayVoteStatus, ...DayVoteStatus[]]

export const dayVoteChoiceSchema = z.enum(choiceValues)
export const dayVoteStatusSchema = z.enum(statusValues)

export const dayNominationSchema = z.object({
  id: z.string().min(1),
  day: z.number().int().positive(),
  nominatorId: playerIdSchema,
  nominatorName: playerNameSchema,
  targetId: playerIdSchema,
  targetName: playerNameSchema,
  createdAt: timestampSchema,
}).strict()

export const dayVoteBallotSchema = z.object({
  voterId: playerIdSchema,
  voterName: playerNameSchema,
  choice: dayVoteChoiceSchema,
}).strict()

export const dayVoteResultSchema = z.object({
  yesCount: z.number().int().nonnegative(),
  noCount: z.number().int().nonnegative(),
  threshold: z.number().int().positive(),
  passed: z.boolean(),
}).strict()

export const dayVoteSnapshotSchema = z.object({
  status: dayVoteStatusSchema,
  day: z.number().int().positive(),
  nomination: dayNominationSchema.nullable(),
  eligibleVoterIds: z.array(playerIdSchema),
  ballots: z.array(dayVoteBallotSchema),
  livingPlayerCount: z.number().int().positive(),
  yesCount: z.number().int().nonnegative(),
  noCount: z.number().int().nonnegative(),
  threshold: z.number().int().positive(),
  closesAt: timestampSchema.nullable(),
  result: dayVoteResultSchema.nullable(),
}).strict()

export const dayNominationProposeCommandSchema = z.object({
  expectedRevision: revisionSchema,
  targetPlayerId: playerIdSchema,
}).strict()

export const dayNominationDecisionCommandSchema = z.object({
  expectedRevision: revisionSchema,
  nominationId: z.string().min(1),
}).strict()

export const dayVoteSubmitCommandSchema = z.object({
  expectedRevision: revisionSchema,
  choice: dayVoteChoiceSchema,
}).strict()

export type DayNomination = z.infer<typeof dayNominationSchema>
export type DayVoteBallot = z.infer<typeof dayVoteBallotSchema>
export type DayVoteResult = z.infer<typeof dayVoteResultSchema>
export type DayVoteSnapshot = z.infer<typeof dayVoteSnapshotSchema>
export type DayNominationProposeCommand = z.infer<typeof dayNominationProposeCommandSchema>
export type DayNominationDecisionCommand = z.infer<typeof dayNominationDecisionCommandSchema>
export type DayVoteSubmitCommand = z.infer<typeof dayVoteSubmitCommandSchema>
