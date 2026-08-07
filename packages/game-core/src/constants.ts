import { getRoleIdsByCategory, ROLE_CATEGORY, type RoleId } from './roles'

export const PLAYER_COUNT = {
  MINIMUM: 5,
  MAXIMUM: 12,
} as const

export const SUPPORTED_PLAYER_COUNTS = [5, 6, 7, 8, 9, 10, 11, 12] as const

export type SupportedPlayerCount = (typeof SUPPORTED_PLAYER_COUNTS)[number]

export interface GameComposition {
  readonly villagers: number
  readonly outsiders: number
  readonly werewolves: number
}

export const GAME_COMPOSITION_BY_PLAYER_COUNT = {
  5: { villagers: 3, outsiders: 0, werewolves: 2 },
  6: { villagers: 3, outsiders: 1, werewolves: 2 },
  7: { villagers: 5, outsiders: 0, werewolves: 2 },
  8: { villagers: 5, outsiders: 1, werewolves: 2 },
  9: { villagers: 5, outsiders: 2, werewolves: 2 },
  10: { villagers: 7, outsiders: 0, werewolves: 3 },
  11: { villagers: 7, outsiders: 1, werewolves: 3 },
  12: { villagers: 7, outsiders: 2, werewolves: 3 },
} as const satisfies Record<SupportedPlayerCount, GameComposition>

export const OUTSIDER_ID = {
  DRUNK: 'drunk',
} as const

export type OutsiderId = RoleId | typeof OUTSIDER_ID.DRUNK

export const AVAILABLE_OUTSIDER_IDS = [
  ...getRoleIdsByCategory(ROLE_CATEGORY.OUTSIDER),
  OUTSIDER_ID.DRUNK,
] as const satisfies readonly OutsiderId[]

export const BLUFF_INFORMATION_TYPE = {
  RENARD: 'renard',
  PETITE_FILLE: 'petite-fille',
} as const

export function isSupportedPlayerCount(
  playerCount: number,
): playerCount is SupportedPlayerCount {
  return SUPPORTED_PLAYER_COUNTS.includes(playerCount as SupportedPlayerCount)
}

export function getGameComposition(playerCount: number): GameComposition {
  if (!isSupportedPlayerCount(playerCount)) {
    throw new RangeError(
      `Invalid player count: ${playerCount}. Must be between ${PLAYER_COUNT.MINIMUM} and ${PLAYER_COUNT.MAXIMUM} players.`,
    )
  }

  return GAME_COMPOSITION_BY_PLAYER_COUNT[playerCount]
}
