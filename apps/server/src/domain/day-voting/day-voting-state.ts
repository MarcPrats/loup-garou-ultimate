import type {
  DayNomination,
  DayVoteBallot,
  DayVoteDailyResult,
  DayVoteResult,
  DayVoteRound,
  DayVoteStatus,
  PlayerId,
} from '@lgu/contracts'

export interface DayVotingState {
  day: number
  status: DayVoteStatus
  nominatedByIds: PlayerId[]
  nominatedTargetIds: PlayerId[]
  nomination: DayNomination | null
  eligibleVoterIds: PlayerId[]
  ballots: DayVoteBallot[]
  completedRounds: DayVoteRound[]
  livingPlayerCount: number
  yesCount: number
  noCount: number
  threshold: number
  closesAt: number | null
  result: DayVoteResult | null
  dailyResult: DayVoteDailyResult
}
