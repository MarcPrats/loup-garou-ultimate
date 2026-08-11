import { z } from 'zod'

import {
  GAME_PHASE_PERIOD,
  type GamePhasePeriod,
} from './constants'

const gamePhasePeriodValues = Object.values(GAME_PHASE_PERIOD) as [
  GamePhasePeriod,
  ...GamePhasePeriod[],
]

export const gamePhasePeriodSchema = z.enum(gamePhasePeriodValues)

export const gamePhaseSchema = z.object({
  period: gamePhasePeriodSchema,
  number: z.number().int().positive(),
}).strict()

export type GamePhase = z.infer<typeof gamePhaseSchema>

export function createInitialGamePhase(): GamePhase {
  return { period: GAME_PHASE_PERIOD.NIGHT, number: 1 }
}

export function getNextGamePhase(phase: GamePhase): GamePhase {
  if (phase.period === GAME_PHASE_PERIOD.NIGHT) {
    return { period: GAME_PHASE_PERIOD.DAY, number: phase.number }
  }
  return { period: GAME_PHASE_PERIOD.NIGHT, number: phase.number + 1 }
}

export function getPreviousGamePhase(phase: GamePhase): GamePhase | null {
  if (phase.period === GAME_PHASE_PERIOD.DAY) {
    return { period: GAME_PHASE_PERIOD.NIGHT, number: phase.number }
  }
  if (phase.number === 1) return null
  return { period: GAME_PHASE_PERIOD.DAY, number: phase.number - 1 }
}
