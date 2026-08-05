import { BLUFF_INFORMATION_TYPE } from './constants'
import type {
  NonUltimateWerewolfRoleId,
  RoleId,
  TrueVillagerRoleId,
  VillageTeamRoleId,
} from './roles'

export type PlayerId = string

export interface AssignablePlayer {
  readonly id: PlayerId
  readonly name: string
}

export interface PlayerAssignment {
  readonly playerId: PlayerId
  readonly roleId: RoleId
  readonly isDrunk: boolean
}

export interface RenardInformation {
  readonly playerId: PlayerId
  readonly roleId: NonUltimateWerewolfRoleId
  readonly seenPlayerIds: readonly [PlayerId, PlayerId]
}

export interface PetiteFilleInformation {
  readonly playerId: PlayerId
  readonly roleId: TrueVillagerRoleId
  readonly seenPlayerIds: readonly [PlayerId, PlayerId]
}

export interface BluffRoleAssignment {
  readonly playerId: PlayerId
  readonly roleId: VillageTeamRoleId
}

export type BluffSpecialInformation =
  | {
      readonly playerId: PlayerId
      readonly type: typeof BLUFF_INFORMATION_TYPE.RENARD
      readonly roleId: NonUltimateWerewolfRoleId
      readonly seenPlayerIds: readonly [PlayerId, PlayerId]
    }
  | {
      readonly playerId: PlayerId
      readonly type: typeof BLUFF_INFORMATION_TYPE.PETITE_FILLE
      readonly roleId: TrueVillagerRoleId
      readonly seenPlayerIds: readonly [PlayerId, PlayerId]
    }

export interface AssignmentResult {
  readonly assignments: readonly PlayerAssignment[]
  readonly drunkPlayerId: PlayerId | null
  readonly renardInformation: RenardInformation | null
  readonly petiteFilleInformation: PetiteFilleInformation | null
  readonly bluffRoles: readonly BluffRoleAssignment[]
  readonly voyanteDecoyPlayerId: PlayerId | null
  readonly bluffSpecialInformation: readonly BluffSpecialInformation[]
}
