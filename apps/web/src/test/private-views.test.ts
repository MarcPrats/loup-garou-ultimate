import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import {
  ROLE_CATEGORY,
  TEAM,
  type HostPlayerAssignment,
  type PrivateAssignment,
} from '@lgu/contracts'
import {
  ROLE_DEFINITIONS,
  ROLE_ID,
} from '@lgu/game-core'

import HostAssignmentCard from '../components/HostAssignmentCard.vue'
import PlayerAssignmentPanel from '../components/PlayerAssignmentPanel.vue'
import { ROUTE_NAME } from '../constants/app'
import { createAppRouter } from '../router'
import {
  ROLE_PRESENTATION_BY_ID,
  getRolePresentation,
} from '../constants/role-presentation'

const ACCESS_TOKEN = 'role_00000000000000000000000000000000001'

function createPrivateAssignment(): PrivateAssignment {
  return {
    player: { id: 'player_1', name: 'Marc' },
    role: {
      id: ROLE_ID.ULTIMATE_WEREWOLF,
      team: TEAM.WEREWOLVES,
      category: ROLE_CATEGORY.ULTIMATE_WEREWOLF,
    },
    roleAccessToken: ACCESS_TOKEN,
    bluffRoleId: ROLE_ID.RENARD,
    specialInformation: {
      type: 'renard',
      roleId: ROLE_ID.INFECT_WEREWOLF,
      players: [
        { id: 'player_2', name: 'Alice' },
        { id: 'player_3', name: 'Nora' },
      ],
    },
  }
}

describe('role presentation catalogue', () => {
  it('covers every canonical game-core role', () => {
    expect(Object.keys(ROLE_PRESENTATION_BY_ID)).toHaveLength(
      ROLE_DEFINITIONS.length,
    )
    for (const role of ROLE_DEFINITIONS) {
      const presentation = getRolePresentation(role.id)
      expect(presentation?.name).toBe(role.name)
      expect(presentation?.imagePath).toMatch(/^\/.+\.webp$/)
      expect(presentation?.power.length).toBeGreaterThan(0)
      expect(presentation?.info.length).toBeGreaterThan(0)
    }
    expect(ROLE_PRESENTATION_BY_ID[ROLE_ID.PETITE_FILLE].imagePath).toBe('/images/petite-fille.webp')
    expect(ROLE_PRESENTATION_BY_ID[ROLE_ID.MONTREUR_DOURS].imagePath).toBe('/images/montreur-dours.webp')
    expect(ROLE_PRESENTATION_BY_ID[ROLE_ID.ENFANT_SAUVAGE].imagePath).toBe('/images/enfant.webp')
  })
})

describe('player private assignment', () => {
  it('reveals the real role, bluff and fake clue without MJ-only flags', async () => {
    const wrapper = mount(PlayerAssignmentPanel, {
      props: { assignment: createPrivateAssignment() },
    })
    await wrapper.get('[data-testid="role-reveal-card"]').trigger('click')
    const text = wrapper.text()

    expect(text).toContain('Loup Garou Ultime')
    expect(text).toContain('Votre couverture')
    expect(text).toContain('Renard')
    expect(text).toContain('Alice')
    expect(text).toContain('Nora')
    expect(text).not.toContain('Votre véritable rôle')
    expect(text).not.toContain('Ivrogne caché')
    expect(text).not.toContain('Leurre de la Voyante')
  })
})

describe('MJ assignment', () => {
  it('renders hidden Ivrogne and Voyante-decoy indicators only in the MJ card', () => {
    const assignment: HostPlayerAssignment = {
      player: {
        id: 'player_1',
        name: 'Marc',
        connected: true,
      },
      role: {
        id: ROLE_ID.VOYANTE,
        team: TEAM.VILLAGERS,
        category: ROLE_CATEGORY.VILLAGER,
      },
      isDrunk: true,
      isVoyanteDecoy: true,
      bluffRoleId: null,
      specialInformation: null,
    }
    const wrapper = mount(HostAssignmentCard, { props: { assignment } })
    const text = wrapper.text()

    expect(text).toContain('Ivrogne caché')
    expect(text).toContain('Leurre de la Voyante')
    expect(text).toContain('Rôle montré au joueur')
    expect(text).toContain('Voyante')
  })
})
