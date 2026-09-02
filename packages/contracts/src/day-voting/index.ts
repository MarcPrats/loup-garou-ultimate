import { z } from 'zod'

import { playerIdSchema, playerNameSchema, revisionSchema, timestampSchema } from '../identifiers'

export const DAY_VOTE_CHOICE = {
  YES: 'yes',
  NO: 'no',
} as const
export type DayVoteChoice = typeof DAY_VOTE_CHOICE[keyof typeof DAY_VOTE_CHOICE]

export const DAY_VOTE_STATUS = {
  IDLE: 'idle',
  NOMINATION_PENDING: 'nomination-pending',
  NOMINATION_VALIDATED: 'nomination-validated',
  ACTIVE: 'active',
  RESOLVED: 'resolved',
} as const
export type DayVoteStatus = typeof DAY_VOTE_STATUS[keyof typeof DAY_VOTE_STATUS]

export const DAY_VOTE_DAILY_RESULT_STATUS = {
  NONE: 'none',
  WINNER: 'winner',
  NO_MAJORITY: 'no-majority',
  TIE: 'tie',
} as const
export type DayVoteDailyResultStatus = typeof DAY_VOTE_DAILY_RESULT_STATUS[keyof typeof DAY_VOTE_DAILY_RESULT_STATUS]

const choiceValues = Object.values(DAY_VOTE_CHOICE) as [DayVoteChoice, ...DayVoteChoice[]]
const statusValues = Object.values(DAY_VOTE_STATUS) as [DayVoteStatus, ...DayVoteStatus[]]
const dailyResultStatusValues = Object.values(DAY_VOTE_DAILY_RESULT_STATUS) as [DayVoteDailyResultStatus, ...DayVoteDailyResultStatus[]]

export const dayVoteChoiceSchema = z.enum(choiceValues)
export const dayVoteStatusSchema = z.enum(statusValues)
export const dayVoteDailyResultStatusSchema = z.enum(dailyResultStatusValues)

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

export const dayVoteRoundSchema = z.object({
  nomination: dayNominationSchema,
  ballots: z.array(dayVoteBallotSchema),
  result: dayVoteResultSchema,
}).strict()

export const dayVotePrivateStatusSchema = z.object({
  day: z.number().int().positive(),
  nominationId: z.string().min(1).nullable(),
  choice: dayVoteChoiceSchema.nullable(),
}).strict()

export const dayVoteDailyResultSchema = z.object({
  status: dayVoteDailyResultStatusSchema,
  targetId: playerIdSchema.nullable(),
  targetName: playerNameSchema.nullable(),
  yesCount: z.number().int().nonnegative().nullable(),
}).strict()

export const dayVoteSnapshotSchema = z.object({
  status: dayVoteStatusSchema,
  day: z.number().int().positive(),
  nomination: dayNominationSchema.nullable(),
  nominatedByIds: z.array(playerIdSchema),
  nominatedTargetIds: z.array(playerIdSchema),
  eligibleVoterIds: z.array(playerIdSchema),
  ballots: z.array(dayVoteBallotSchema),
  completedRounds: z.array(dayVoteRoundSchema),
  livingPlayerCount: z.number().int().positive(),
  yesCount: z.number().int().nonnegative(),
  noCount: z.number().int().nonnegative(),
  threshold: z.number().int().positive(),
  closesAt: timestampSchema.nullable(),
  result: dayVoteResultSchema.nullable(),
  dailyResult: dayVoteDailyResultSchema,
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

export const dayVotingEnabledCommandSchema = z.object({
  expectedRevision: revisionSchema,
  enabled: z.boolean(),
}).strict()

export type DayNomination = z.infer<typeof dayNominationSchema>
export type DayVoteBallot = z.infer<typeof dayVoteBallotSchema>
export type DayVoteResult = z.infer<typeof dayVoteResultSchema>
export type DayVoteRound = z.infer<typeof dayVoteRoundSchema>
export type DayVoteDailyResult = z.infer<typeof dayVoteDailyResultSchema>
export type DayVotePrivateStatus = z.infer<typeof dayVotePrivateStatusSchema>
export type DayVoteSnapshot = z.infer<typeof dayVoteSnapshotSchema>
export type DayNominationProposeCommand = z.infer<typeof dayNominationProposeCommandSchema>
export type DayNominationDecisionCommand = z.infer<typeof dayNominationDecisionCommandSchema>
export type DayVoteSubmitCommand = z.infer<typeof dayVoteSubmitCommandSchema>
export type DayVotingEnabledCommand = z.infer<typeof dayVotingEnabledCommandSchema>
