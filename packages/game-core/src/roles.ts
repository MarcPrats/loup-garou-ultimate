export const TEAM = {
  VILLAGERS: 'villagers',
  WEREWOLVES: 'werewolves',
} as const

export type Team = (typeof TEAM)[keyof typeof TEAM]

export const ROLE_CATEGORY = {
  ULTIMATE_WEREWOLF: 'ultimate-werewolf',
  WEREWOLF: 'werewolf',
  VILLAGER: 'villager',
  OUTSIDER: 'outsider',
} as const

export type RoleCategory = (typeof ROLE_CATEGORY)[keyof typeof ROLE_CATEGORY]

export const ROLE_ID = {
  ULTIMATE_WEREWOLF: 'loup-garou-ultime',
  INFECT_WEREWOLF: 'infect-loup',
  GRAND_WEREWOLF: 'grand-loup',
  PETITE_FILLE: 'petite-fille',
  RENARD: 'renard',
  MONTREUR_DOURS: 'montreur-dours',
  CUPIDON: 'cupidon',
  VOYANTE: 'voyante',
  CHEVALIER: 'chevalier',
  CAPITAINE: 'capitaine',
  CHASSEUR: 'chasseur',
  FLUTISTE: 'flutiste',
  SORCIERE: 'sorciere',
  ANCIEN: 'ancien',
  ENFANT_SAUVAGE: 'enfant-sauvage',
  ANGEL: 'ange',
} as const

export interface RoleDefinition {
  readonly id: string
  readonly name: string
  readonly team: Team
  readonly category: RoleCategory
}

export const ROLE_DEFINITIONS = [
  { id: ROLE_ID.ULTIMATE_WEREWOLF, name: 'Loup Garou Ultime', team: TEAM.WEREWOLVES, category: ROLE_CATEGORY.ULTIMATE_WEREWOLF },
  { id: ROLE_ID.INFECT_WEREWOLF, name: 'Infect Loup Garou', team: TEAM.WEREWOLVES, category: ROLE_CATEGORY.WEREWOLF },
  { id: ROLE_ID.GRAND_WEREWOLF, name: 'Grand Loup Garou', team: TEAM.WEREWOLVES, category: ROLE_CATEGORY.WEREWOLF },
  { id: ROLE_ID.PETITE_FILLE, name: 'Petite Fille', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.RENARD, name: 'Renard', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.MONTREUR_DOURS, name: 'Montreur d’ours', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.CUPIDON, name: 'Cupidon', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.VOYANTE, name: 'Voyante', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.CHEVALIER, name: 'Chevalier', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.CAPITAINE, name: 'Capitaine', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.CHASSEUR, name: 'Chasseur', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.FLUTISTE, name: 'Joueur de flûte', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.SORCIERE, name: 'Sorcière', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.ANCIEN, name: 'Ancien', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.ENFANT_SAUVAGE, name: 'Enfant Sauvage', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
  { id: ROLE_ID.ANGEL, name: 'Ange', team: TEAM.VILLAGERS, category: ROLE_CATEGORY.OUTSIDER },
] as const satisfies readonly RoleDefinition[]

export type RoleId = (typeof ROLE_DEFINITIONS)[number]['id']
export type WerewolfRoleId = Extract<RoleId,
  | typeof ROLE_ID.ULTIMATE_WEREWOLF
  | typeof ROLE_ID.INFECT_WEREWOLF
  | typeof ROLE_ID.GRAND_WEREWOLF>
export type NonUltimateWerewolfRoleId = Exclude<WerewolfRoleId, typeof ROLE_ID.ULTIMATE_WEREWOLF>
export type VillageTeamRoleId = Exclude<RoleId, WerewolfRoleId>
export type TrueVillagerRoleId = Exclude<VillageTeamRoleId, typeof ROLE_ID.ANGEL>

const rolesById = new Map<RoleId, (typeof ROLE_DEFINITIONS)[number]>(
  ROLE_DEFINITIONS.map((role) => [role.id, role]),
)

export function getRoleDefinition(roleId: RoleId): (typeof ROLE_DEFINITIONS)[number] {
  const role = rolesById.get(roleId)
  if (!role) throw new Error(`Unknown role: ${roleId}`)
  return role
}

export function getRoleIdsByTeam(team: Team): RoleId[] {
  return ROLE_DEFINITIONS.filter((role) => role.team === team).map((role) => role.id)
}

export function getRoleIdsByCategory(category: RoleCategory): RoleId[] {
  return ROLE_DEFINITIONS.filter((role) => role.category === category).map((role) => role.id)
}

export function isVillageTeamRole(roleId: RoleId): roleId is VillageTeamRoleId {
  return getRoleDefinition(roleId).team === TEAM.VILLAGERS
}

export function isWerewolfRole(roleId: RoleId): roleId is WerewolfRoleId {
  return getRoleDefinition(roleId).team === TEAM.WEREWOLVES
}

export function isNonUltimateWerewolfRole(roleId: RoleId): roleId is NonUltimateWerewolfRoleId {
  return isWerewolfRole(roleId) && roleId !== ROLE_ID.ULTIMATE_WEREWOLF
}

export function isTrueVillagerRole(roleId: RoleId): roleId is TrueVillagerRoleId {
  return getRoleDefinition(roleId).category === ROLE_CATEGORY.VILLAGER
}

export function getEffectiveCategory(roleId: RoleId, isDrunk: boolean): RoleCategory {
  return isDrunk ? ROLE_CATEGORY.OUTSIDER : getRoleDefinition(roleId).category
}
