import {
  DAY_VOTE_CHOICE,
  DAY_VOTE_STATUS,
  ERROR_CODE,
  GAME_LOG_EVENT_TYPE,
  GAME_PHASE_PERIOD,
} from '@lgu/contracts'

import { LobbyError } from '../lobby-error'
import type { LobbyPlayerState, LobbyState } from '../lobby-types'

export function assertDayPhase(lobby: LobbyState): void {
  if (lobby.gamePhase?.period !== GAME_PHASE_PERIOD.DAY) {
    throw new LobbyError(ERROR_CODE.INVALID_GAME_EVENT, 'Le vote est disponible uniquement pendant le jour.')
  }
}

export function getLivingRegularPlayers(lobby: LobbyState): LobbyPlayerState[] {
  const deadPlayerIds = new Set(lobby.game?.gameLog
    .filter((event) => event.eventType !== GAME_LOG_EVENT_TYPE.DAY_VOTE)
    .map((event) => event.targetPlayerId) ?? [])
  return lobby.players.filter((player) => !player.isHost && !deadPlayerIds.has(player.id))
}

export function resetDayVoting(lobby: LobbyState, day: number): void {
  const game = lobby.game
  if (!game) return
  const livingPlayerCount = getLivingRegularPlayers(lobby).length
  game.dayVoting = {
    day,
    status: DAY_VOTE_STATUS.IDLE,
    nominatedByIds: [],
    nominatedTargetIds: [],
    nomination: null,
    eligibleVoterIds: [],
    ballots: [],
    livingPlayerCount,
    yesCount: 0,
    noCount: 0,
    threshold: Math.floor(livingPlayerCount / 2) + 1,
    closesAt: null,
    result: null,
  }
}

export function resolveDayVote(lobby: LobbyState, now: number): void {
  const game = lobby.game
  if (!game || game.dayVoting.status !== DAY_VOTE_STATUS.ACTIVE || !game.dayVoting.nomination) return
  const answered = new Set(game.dayVoting.ballots.map((ballot) => ballot.voterId))
  for (const voterId of game.dayVoting.eligibleVoterIds) {
    if (answered.has(voterId)) continue
    const player = lobby.players.find((candidate) => candidate.id === voterId)
    if (player) game.dayVoting.ballots.push({ voterId, voterName: player.name, choice: DAY_VOTE_CHOICE.NO })
  }
  game.dayVoting.yesCount = game.dayVoting.ballots.filter((ballot) => ballot.choice === DAY_VOTE_CHOICE.YES).length
  game.dayVoting.noCount = game.dayVoting.ballots.length - game.dayVoting.yesCount
  game.dayVoting.result = {
    yesCount: game.dayVoting.yesCount,
    noCount: game.dayVoting.noCount,
    threshold: game.dayVoting.threshold,
    passed: game.dayVoting.yesCount >= game.dayVoting.threshold,
  }
  game.dayVoting.status = DAY_VOTE_STATUS.RESOLVED
  game.dayVoting.closesAt = now
  game.gameLog.push({
    id: `game-event-${lobby.revision + 1}`,
    eventType: GAME_LOG_EVENT_TYPE.DAY_VOTE,
    phase: lobby.gamePhase!,
    targetPlayerId: game.dayVoting.nomination.targetId,
    targetPlayerName: game.dayVoting.nomination.targetName,
    voteDetails: {
      nominationId: game.dayVoting.nomination.id,
      nominatorName: game.dayVoting.nomination.nominatorName,
      targetName: game.dayVoting.nomination.targetName,
      yesVoterNames: game.dayVoting.ballots.filter((ballot) => ballot.choice === DAY_VOTE_CHOICE.YES).map((ballot) => ballot.voterName),
      noVoterNames: game.dayVoting.ballots.filter((ballot) => ballot.choice === DAY_VOTE_CHOICE.NO).map((ballot) => ballot.voterName),
      threshold: game.dayVoting.threshold,
      passed: game.dayVoting.result.passed,
    },
  })
}
