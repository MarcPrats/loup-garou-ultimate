import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ROLE_CATEGORY, TEAM, type HostDashboard, type PrivateAssignment } from '@lgu/contracts'
import { ROLE_ID } from '@lgu/game-core'

import HostDashboardPanel from '../components/HostDashboardPanel.vue'
import PlayerAssignmentPanel from '../components/PlayerAssignmentPanel.vue'
import RoleInfoPanel from '../components/RoleInfoPanel.vue'
import { PUBLIC_LINK, ROUTE_NAME } from '../constants/app'
import { RULES_ROLE_CATALOG } from '../constants/rules-page'
import { createAppRouter } from '../router'
import HomeView from '../views/HomeView.vue'
import RulesView from '../views/RulesView.vue'
import { getRolePresentation } from '../constants/role-presentation'

const assignment: PrivateAssignment = {
  player: { id: 'player_1', name: 'Marc' },
  role: { id: ROLE_ID.ULTIMATE_WEREWOLF, team: TEAM.WEREWOLVES, category: ROLE_CATEGORY.ULTIMATE_WEREWOLF },
  roleAccessToken: 'role_00000000000000000000000000000000001',
  bluffRoleId: ROLE_ID.RENARD,
  specialInformation: {
    type: 'renard',
    roleId: ROLE_ID.INFECT_WEREWOLF,
    players: [{ id: 'player_2', name: 'Alice' }, { id: 'player_3', name: 'Nora' }],
  },
}

describe('V3 UI parity', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('restores the three original home actions in their original order', async () => {
    const pinia = createPinia()
    const router = createAppRouter(pinia)
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    expect(wrapper.findAll('.app-home-action').map((item) => item.text())).toEqual([
      '🎮 Créer / Rejoindre la partie',
      '📜 Règles',
      '🧪 Simulateur',
      '📚 Wiki des règles',
    ])
    expect(wrapper.get('#lobbies-btn').attributes('href')).toBe('/lobbies')
    expect(wrapper.get('a[href="/rules"]')).toBeTruthy()
    expect(wrapper.get('a[href="/simulator"]')).toBeTruthy()
    expect(wrapper.get(`a[href="${PUBLIC_LINK.WIKI}"]`).attributes('target')).toBe('_blank')
  })

  it('keeps every lobbies URL as the name-entry route', () => {
    const router = createAppRouter(createPinia())
    for (const path of ['/lobbies', '/lobbies/']) {
      expect(router.resolve(path).name).toBe(ROUTE_NAME.LOBBIES)
    }
  })

  it('restores the complete player role, bluff and clue content', () => {
    const wrapper = mount(PlayerAssignmentPanel, { props: { assignment } })
    const text = wrapper.text()
    expect(text).toContain('Votre Pouvoir')
    expect(text).toContain("Chaque nuit (sauf la première), choisissez un joueur")
    expect(text).toContain('Autres Infos')
    expect(text).toContain('Votre Rôle de Couverture')
    expect(text).toContain('Pouvoir (Bluff)')
    expect(text).toContain('Infos (Bluff)')
    expect(text).toContain('Info Renard (Bluff)')
    expect(text).toContain('Ce que vous devriez savoir')
    expect(text).toContain('Infect Loup Garou')
    expect(text).toContain('Alice, Nora')
    expect(wrapper.get('a[href="/rules"]').text()).toContain('Consulter les Règles')
    expect(text).not.toContain('Ivrogne caché')
    expect(text).not.toContain('Leurre de la Voyante')
  })


  it('restores the game-master table while keeping hidden indicators private', () => {
    const dashboard: HostDashboard = {
      playerCount: 1,
      werewolfCount: 0,
      villagerTeamCount: 1,
      roleAccessToken: assignment.roleAccessToken,
      players: [{
        player: { id: 'player_1', name: 'Marc', connected: true },
        role: { id: ROLE_ID.VOYANTE, team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
        isDrunk: true,
        isVoyanteDecoy: true,
        bluffRoleId: null,
        specialInformation: null,
      }],
    }
    const wrapper = mount(HostDashboardPanel, { props: { dashboard } })
    const text = wrapper.text()
    expect(text).toContain("Vue d'ensemble de tous les rôles")
    expect(text).toContain('JoueurRôleÉquipeDétails')
    expect(text).toContain('🍺 Bourré')
    expect(text).toContain('🔮 Leurre Voyante')
    expect(wrapper.find('.app-gm-mobile-cards').exists()).toBe(true)
    expect(wrapper.findAll('.app-gm-mobile-card')).not.toHaveLength(0)
  })

  it('does not show the bluff knowledge section for a real Petite Fille', () => {
    const realPetiteFille: PrivateAssignment = {
      ...assignment,
      role: { id: ROLE_ID.PETITE_FILLE, team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
      bluffRoleId: null,
      specialInformation: {
        type: 'petite-fille',
        roleId: ROLE_ID.VOYANTE,
        players: [{ id: 'player_2', name: 'Alice' }, { id: 'player_3', name: 'Nora' }],
      },
    }
    const text = mount(PlayerAssignmentPanel, { props: { assignment: realPetiteFille } }).text()
    expect(text).not.toContain('Info Petite Fille')
    expect(text).not.toContain('Informations privées')
    expect(text).not.toContain('Ce que vous devriez savoir')
  })

  it('hides private clue information for a real Renard', () => {
    const realRenard: PrivateAssignment = {
      ...assignment,
      role: { id: ROLE_ID.RENARD, team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
      bluffRoleId: null,
    }
    const text = mount(PlayerAssignmentPanel, { props: { assignment: realRenard } }).text()
    expect(text).not.toContain('Informations privées')
    expect(text).not.toContain('Info Renard')
    expect(text).not.toContain('Info Renard (Bluff)')
  })
})


describe('Vue rules page', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('renders the complete rules page as composed Vue components', async () => {
    const router = createAppRouter(createPinia())
    await router.push('/rules')
    await router.isReady()
    const wrapper = mount(RulesView, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
        },
      },
    })

    expect(wrapper.text()).toContain('🎭 Personnages')
    expect(wrapper.findAll('.role-card')).toHaveLength(RULES_ROLE_CATALOG.length)

    await wrapper.get('#rules-tab-distribution').trigger('click')
    expect(wrapper.text()).toContain('Répartition des personnages')

    await wrapper.get('#rules-tab-rules').trigger('click')
    expect(wrapper.text()).toContain('Comment jouer au Loup Garou Ultime ?')

    await wrapper.get('#rules-tab-night').trigger('click')
    expect(wrapper.text()).toContain('Ordre de la première nuit')
    expect(wrapper.text()).toContain('Ordre des nuits suivantes')
    expect(wrapper.text()).toContain('Bibliothécaire')
    expect(wrapper.findAll('.night-block')).toHaveLength(2)
    expect(createAppRouter(createPinia()).resolve('/rules').name).toBe(ROUTE_NAME.RULES)
    expect(createAppRouter(createPinia()).resolve('/rules/role/voyante').name).toBe(ROUTE_NAME.ROLE_DETAIL)
  })
})

describe('shared bluff role view', () => {
  it('uses the same CSS structure and emojis for Reference and Bluff views', () => {
    const wrapper = mount(RoleInfoPanel, {
      props: { roleId: ROLE_ID.GRAND_WEREWOLF, powerTitle: 'Votre Pouvoir', infoTitle: 'Autres Infos' },
    })
    expect(wrapper.find('.app-bluff-section').exists()).toBe(true)
    expect(wrapper.find('.app-power-section .app-section-icon').text()).toBe('⚡')
    expect(wrapper.find('.app-info-section .app-section-icon').text()).toBe('💡')
    expect(wrapper.text()).toContain('Votre Pouvoir')
    expect(wrapper.text()).toContain('Autres Infos')
    expect(wrapper.text()).toContain('Loup-garou')
  })
})

  it('resolves the canonical werewolf roles used by the reference catalogue', () => {
    expect(getRolePresentation('infect-loup')).toBeTruthy()
    expect(getRolePresentation('grand-loup')).toBeTruthy()
  })
