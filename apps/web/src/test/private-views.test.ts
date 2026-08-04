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
import RoleAccessLink from '../components/RoleAccessLink.vue'
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
      expect(presentation?.instructions.length).toBeGreaterThan(0)
    }
    expect(ROLE_PRESENTATION_BY_ID[ROLE_ID.PETITE_FILLE].imagePath).toBe('/petite-fille.webp')
    expect(ROLE_PRESENTATION_BY_ID[ROLE_ID.MONTREUR_DOURS].imagePath).toBe('/montreur-dours.webp')
    expect(ROLE_PRESENTATION_BY_ID[ROLE_ID.ENFANT_SAUVAGE].imagePath).toBe('/enfant.webp')
    expect(ROLE_PRESENTATION_BY_ID[ROLE_ID.FLUTISTE].instructions.join(' ')).toContain('Marginal')
  })
})

describe('player private assignment', () => {
  it('renders the real role, bluff and fake clue without MJ-only flags', () => {
    const wrapper = mount(PlayerAssignmentPanel, {
      props: { assignment: createPrivateAssignment() },
    })
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

describe('role access link', () => {
  it('keeps the bearer token in the URL fragment', () => {
    const wrapper = mount(RoleAccessLink, {
      props: { token: ACCESS_TOKEN },
    })
    const input = wrapper.get('input')

    expect(input.attributes('value')).toBe(
      `${window.location.origin}/access#${ACCESS_TOKEN}`,
    )
    expect(input.attributes('value')).not.toContain('/access/')
  })

  it('resolves the private token from a fragment-only anonymous route', () => {
    const router = createAppRouter(createPinia())
    const resolved = router.resolve(`/access#${ACCESS_TOKEN}`)

    expect(resolved.name).toBe(ROUTE_NAME.ROLE_ACCESS)
    expect(resolved.meta.roleAccess).toBe(true)
    expect(resolved.hash).toBe(`#${ACCESS_TOKEN}`)
  })

})
