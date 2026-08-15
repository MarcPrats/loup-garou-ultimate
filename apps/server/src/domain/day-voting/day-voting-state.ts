import type {
  DayNomination,
  DayVoteBallot,
  DayVoteResult,
  PlayerId,
} from '@lgu/contracts'

export interface DayVotingState {
  day: number
  status: 'idle' | 'nomination-pending' | 'nomination-validated' | 'active' | 'resolved'
  nominatedByIds: PlayerId[]
  nominatedTargetIds: PlayerId[]
  nomination: DayNomination | null
  eligibleVoterIds: PlayerId[]
  ballots: DayVoteBallot[]
  livingPlayerCount: number
  yesCount: number
  noCount: number
  threshold: number
  closesAt: number | null
  result: DayVoteResult | null
}
