export { assignRoles } from './assign-roles'
export { getWerewolfCount, validatePlayerCount } from './game-setup'
export {
  AVAILABLE_OUTSIDER_IDS,
  BLUFF_INFORMATION_TYPE,
  GAME_COMPOSITION_BY_PLAYER_COUNT,
  OUTSIDER_ID,
  PLAYER_COUNT,
  SUPPORTED_PLAYER_COUNTS,
  getGameComposition,
  isSupportedPlayerCount,
  type GameComposition,
  type OutsiderId,
  type SupportedPlayerCount,
} from './constants'
export {
  createMathRandomSource,
  createSeededRandomSource,
  pickRandom,
  randomIndex,
  shuffle,
  type RandomSource,
} from './random'
export {
  ROLE_CATEGORY,
  ROLE_DEFINITIONS,
  ROLE_ID,
  TEAM,
  getEffectiveCategory,
  getRoleDefinition,
  getRoleIdsByCategory,
  getRoleIdsByTeam,
  isNonUltimateWerewolfRole,
  isTrueVillagerRole,
  isVillageTeamRole,
  isWerewolfRole,
  type NonUltimateWerewolfRoleId,
  type RoleCategory,
  type RoleDefinition,
  type RoleId,
  type Team,
  type TrueVillagerRoleId,
  type VillageTeamRoleId,
  type WerewolfRoleId,
} from './roles'
export type {
  AssignablePlayer,
  AssignmentResult,
  BluffRoleAssignment,
  BluffSpecialInformation,
  PetiteFilleInformation,
  PlayerAssignment,
  PlayerId,
  RenardInformation,
} from './types'

export const GAME_CORE_VERSION = '3.0.0-dev' as const
