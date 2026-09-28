import { describe, expect, it } from 'vitest'

import {
  buildBibliothecaireInformation,
  buildPetiteFilleInformation,
  buildRenardInformation,
} from '../src/special-information'
import { type AssignmentMap } from '../src/player-assignments'
import { ROLE_ID } from '../src/roles'
import type { AssignablePlayer } from '../src/types'

const randomAlwaysFirst = { next: () => 0 }

describe('special information visible-role exceptions', () => {
  it('lets the Renard reveal the Recluse', () => {
    const players: AssignablePlayer[] = [
      { id: 'renard', name: 'Renard' },
      { id: 'recluse', name: 'Recluse' },
      { id: 'villageois', name: 'Villageois' },
    ]
    const assignments: AssignmentMap = new Map([
      ['renard', ROLE_ID.RENARD],
      ['recluse', ROLE_ID.RECLUSE],
      ['villageois', ROLE_ID.VOYANTE],
    ])

    const information = buildRenardInformation(players, assignments, randomAlwaysFirst)

    expect(information?.roleId).toBe(ROLE_ID.RECLUSE)
    expect(information?.seenPlayerIds).toContain('recluse')
  })

  it('lets Petite Fille reveal the Loup Voyant as a Villageois', () => {
    const players: AssignablePlayer[] = [
      { id: 'petite-fille', name: 'Petite Fille' },
      { id: 'loup-voyant', name: 'Loup Voyant' },
      { id: 'villageois', name: 'Villageois' },
    ]
    const assignments: AssignmentMap = new Map([
      ['petite-fille', ROLE_ID.PETITE_FILLE],
      ['loup-voyant', ROLE_ID.LOUP_VOYANT],
      ['villageois', ROLE_ID.VOYANTE],
    ])

    const information = buildPetiteFilleInformation(
      players,
      assignments,
      null,
      randomAlwaysFirst,
    )

    expect(information?.roleId).toBe(ROLE_ID.LOUP_VOYANT)
    expect(information?.seenPlayerIds).toContain('loup-voyant')
  })

  it('lets Bibliothécaire reveal the Loup Voyant as a Marginal', () => {
    const players: AssignablePlayer[] = [
      { id: 'bibliothecaire', name: 'Bibliothécaire' },
      { id: 'loup-voyant', name: 'Loup Voyant' },
      { id: 'villageois', name: 'Villageois' },
    ]
    const assignments: AssignmentMap = new Map([
      ['bibliothecaire', ROLE_ID.BIBLIOTHECAIRE],
      ['loup-voyant', ROLE_ID.LOUP_VOYANT],
      ['villageois', ROLE_ID.VOYANTE],
    ])

    const information = buildBibliothecaireInformation(
      players,
      assignments,
      null,
      randomAlwaysFirst,
    )

    expect(information?.roleId).toBe(ROLE_ID.LOUP_VOYANT)
    expect(information?.seenPlayerIds).toContain('loup-voyant')
  })
})
