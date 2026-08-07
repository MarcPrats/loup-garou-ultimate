import { describe, expect, it } from 'vitest'

import {
  ROLE_CATEGORY,
  ROLE_DEFINITIONS,
  ROLE_ID,
  TEAM,
  getEffectiveCategory,
  getRoleDefinition,
  isTrueVillagerRole,
} from '../src'

describe('role definitions', () => {
  it('contains one unique definition for each game role', () => {
    expect(ROLE_DEFINITIONS).toHaveLength(18)
    expect(new Set(ROLE_DEFINITIONS.map((role) => role.id)).size).toBe(18)
  })

  it('separates team and role category', () => {
    expect(getRoleDefinition(ROLE_ID.ANGEL)).toMatchObject({
      team: TEAM.VILLAGERS,
      category: ROLE_CATEGORY.OUTSIDER,
    })
    expect(getRoleDefinition(ROLE_ID.ULTIMATE_WEREWOLF)).toMatchObject({
      team: TEAM.WEREWOLVES,
      category: ROLE_CATEGORY.ULTIMATE_WEREWOLF,
    })
  })

  it('computes the hidden Ivrogne as an effective outsider', () => {
    expect(getEffectiveCategory(ROLE_ID.CUPIDON, false)).toBe(ROLE_CATEGORY.VILLAGER)
    expect(getEffectiveCategory(ROLE_ID.CUPIDON, true)).toBe(ROLE_CATEGORY.OUTSIDER)
    expect(isTrueVillagerRole(ROLE_ID.ANGEL)).toBe(false)
  })
})
