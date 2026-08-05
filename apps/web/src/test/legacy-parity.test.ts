import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { ROLE_CATEGORY, TEAM, type HostDashboard, type PrivateAssignment } from '@lgu/contracts'
import { ROLE_ID } from '@lgu/game-core'

import HostDashboardPanel from '../components/HostDashboardPanel.vue'
import PlayerAssignmentPanel from '../components/PlayerAssignmentPanel.vue'
import { LEGACY_PAGE, ROUTE_NAME } from '../constants/app'
import { createAppRouter } from '../router'
import HomeView from '../views/HomeView.vue'
import RulesView from '../views/RulesView.vue'

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

describe('legacy UI parity', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('restores the three original home actions in their original order', async () => {
    const pinia = createPinia()
    const router = createAppRouter(pinia)
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    expect(wrapper.findAll('.legacy-home-action').map((item) => item.text())).toEqual([
      '🎮 Créer / Rejoindre la partie',
      '📜 Règles',
      '📚 Wiki des règles',
    ])
    expect(wrapper.get('#entry-btn').attributes('href')).toBe('/waiting_room')
    expect(wrapper.get('a[href="/reference"]')).toBeTruthy()
    expect(wrapper.get(`a[href="${LEGACY_PAGE.WIKI}"]`).attributes('target')).toBe('_blank')
  })

  it('keeps every legacy waiting-room URL as the name-entry route', () => {
    const router = createAppRouter(createPinia())
    for (const path of ['/waiting_room', '/waiting_room/', '/waiting-room', '/waiting-room/']) {
      expect(router.resolve(path).name).toBe(ROUTE_NAME.ENTRY)
    }
  })

  it('restores the complete legacy player role, bluff and clue content', () => {
    const wrapper = mount(PlayerAssignmentPanel, { props: { assignment, showAccessLink: false } })
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
    expect(wrapper.get('a[href="/reference"]').text()).toContain('Consulter les Règles')
    expect(text).not.toContain('Ivrogne caché')
    expect(text).not.toContain('Leurre de la Voyante')
  })


  it('restores the legacy game-master table while keeping hidden indicators private', () => {
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
    const text = mount(HostDashboardPanel, { props: { dashboard, showAccessLink: false } }).text()
    expect(text).toContain("Vue d'ensemble de tous les rôles")
    expect(text).toContain('JoueurRôleÉquipeDétails')
    expect(text).toContain('🍺 Bourré')
    expect(text).toContain('🔮 Leurre Voyante')
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
    const text = mount(PlayerAssignmentPanel, { props: { assignment: realPetiteFille, showAccessLink: false } }).text()
    expect(text).not.toContain('Info Petite Fille')
    expect(text).not.toContain('Informations privées')
    expect(text).not.toContain('Ce que vous devriez savoir')
  })

  it('labels a real Renard clue as private information, not bluff information', () => {
    const realRenard: PrivateAssignment = {
      ...assignment,
      role: { id: ROLE_ID.RENARD, team: TEAM.VILLAGERS, category: ROLE_CATEGORY.VILLAGER },
      bluffRoleId: null,
    }
    const text = mount(PlayerAssignmentPanel, { props: { assignment: realRenard, showAccessLink: false } }).text()
    expect(text).not.toContain('Informations privées')
    expect(text).not.toContain('Info Renard')
    expect(text).not.toContain('Info Renard (Bluff)')
  })
})


describe('Vue rules page', () => {
  it('renders the complete rules page as composed Vue components', () => {
    const wrapper = mount(RulesView, {
      global: {
        stubs: {
          RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
        },
      },
    })
    const text = wrapper.text()

    expect(text).toContain('🎭 Personnages')
    expect(text).toContain('Répartition des personnages')
    expect(text).toContain('Ordre de la première nuit')
    expect(text).toContain('Ordre des nuits suivantes')
    expect(text).toContain('Bibliothécaire')
    expect(text).toContain('Bientôt disponible')
    expect(wrapper.findAll('.night-block')).toHaveLength(2)
    expect(createAppRouter(createPinia()).resolve('/reference.html').name).toBe(ROUTE_NAME.RULES)
    expect(wrapper.findAll('.role-card')).toHaveLength(22)
  })
})
