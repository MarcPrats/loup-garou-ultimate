import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PLAYER_COUNT_LIMIT,
  ROLE_CATEGORY,
} from '@lgu/contracts'
import {
  GAME_COMPOSITION_BY_PLAYER_COUNT,
  TEAM,
  ROLE_ID,
  type SupportedPlayerCount,
} from '@lgu/game-core'

import { ROUTE_NAME } from '../constants/app'
import {
  createDefaultPlayerNames,
  createSimulatorScenario,
} from '../features/simulator/simulator-engine'
import SimulatorView from '../features/simulator/SimulatorView.vue'
import { createAppRouter } from '../router'

function scenario(
  playerCount: number = PLAYER_COUNT_LIMIT.MINIMUM,
  seed = 'stable-seed',
) {
  return createSimulatorScenario({
    playerNames: createDefaultPlayerNames(playerCount),
    seed,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('simulator engine', () => {
  it('reproduces the complete scenario for the same seed', () => {
    expect(scenario(9, 'same-seed')).toEqual(scenario(9, 'same-seed'))
    expect(scenario(9, 'same-seed')).not.toEqual(scenario(9, 'other-seed'))
  })

  it('matches the canonical composition for every supported player count', () => {
    for (
      let count = PLAYER_COUNT_LIMIT.MINIMUM;
      count <= PLAYER_COUNT_LIMIT.MAXIMUM;
      count += 1
    ) {
      const generated = scenario(count, `composition-${count}`)
      const composition = GAME_COMPOSITION_BY_PLAYER_COUNT[
        count as SupportedPlayerCount
      ]
      const assignments = generated.hostDashboard.players
      const werewolves = assignments.filter(
        (entry) => entry.role.team === TEAM.WEREWOLVES,
      ).length
      const outsiders = assignments.filter(
        (entry) => entry.isDrunk
          || entry.role.category === ROLE_CATEGORY.OUTSIDER,
      ).length
      const villagers = assignments.filter(
        (entry) => !entry.isDrunk
          && entry.role.category === ROLE_CATEGORY.VILLAGER,
      ).length

      expect({ villagers, outsiders, werewolves }).toEqual(composition)
    }
  })

  it('gives the Loup Blanc the same dashboard projection as the real player view', () => {
    let generated = scenario(PLAYER_COUNT_LIMIT.MINIMUM, 'loup-blanc-dashboard')
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const loupBlanc = generated.hostDashboard.players.some(
        (entry) => entry.role.id === ROLE_ID.LOUP_BLANC,
      )
      if (loupBlanc) break
      generated = scenario(PLAYER_COUNT_LIMIT.MINIMUM, `loup-blanc-dashboard-${attempt}`)
    }

    const loupBlancAssignment = generated.hostDashboard.players.find(
      (entry) => entry.role.id === ROLE_ID.LOUP_BLANC,
    )
    expect(loupBlancAssignment).toBeDefined()
    expect(generated.loupBlancDashboards).toHaveLength(1)
    expect(generated.loupBlancDashboards[0]?.playerId).toBe(loupBlancAssignment?.player.id)
    expect(generated.loupBlancDashboards[0]?.dashboard.players).toEqual(
      generated.hostDashboard.players,
    )
  })

  it('keeps the lobby projection free of every private field', () => {
    const serialized = JSON.stringify(scenario().lobby)

    expect(serialized).not.toContain('roleId')
    expect(serialized).not.toContain('roleAccessToken')
    expect(serialized).not.toContain('isDrunk')
    expect(serialized).not.toContain('isVoyanteDecoy')
    expect(serialized).not.toContain('bluffRoleId')
    expect(serialized).not.toContain('specialInformation')
  })

  it('rejects duplicate player names case-insensitively', () => {
    expect(() => createSimulatorScenario({
      playerNames: ['Marc', 'Alice', 'Nora', 'marc', 'Léa'],
      seed: 'duplicates',
    })).toThrow('nom unique')
  })
})

describe('simulator route isolation', () => {
  it('registers the public simulator route in every build', () => {
    const router = createAppRouter(createPinia())

    expect(router.hasRoute(ROUTE_NAME.SIMULATOR)).toBe(true)
    expect(router.resolve('/simulator').meta.simulator).toBe(true)
  })

  it('renders production components without network or storage side effects', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    const wrapper = mount(SimulatorView, {
      global: {
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
      },
    })

    expect(wrapper.text()).not.toContain('Vue publique')
    expect(wrapper.text()).not.toContain('Seed reproductible')
    expect(wrapper.text()).not.toContain('Modifier les noms des joueurs')
    expect(wrapper.text()).toContain('Vue MJ')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(storageWrite).not.toHaveBeenCalled()

    expect(wrapper.text()).toContain("Vue d'ensemble de tous les rôles")
    expect(wrapper.find('.app-gm-night-order').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ordre des nuits')

    const playerSelect = wrapper.get('select[aria-label="Choisir une vue joueur"]')
    const firstPlayerOption = playerSelect.findAll('option')[1]
    if (!firstPlayerOption) throw new Error('Simulator player option is missing')
    await playerSelect.setValue(firstPlayerOption.element.value)
    expect(wrapper.text()).toContain(firstPlayerOption.text())
    expect(wrapper.text()).toContain('Votre Rôle')
    expect(wrapper.find('.app-gm-view').exists()).toBe(false)
    wrapper.unmount()
  })
})
