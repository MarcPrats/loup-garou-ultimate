import { flushPromises, mount } from '@vue/test-utils'
import {
  createMemoryHistory,
  createRouter,
} from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import {
  ROLE_ACCESS_VIEW,
  ROLE_CATEGORY,
  TEAM,
  type RoleAccessResponse,
} from '@lgu/contracts'
import { ROLE_ID } from '@lgu/game-core'

const fetchRoleAccessMock = vi.hoisted(() => vi.fn())
vi.mock('../services/role-access', () => ({
  fetchRoleAccess: fetchRoleAccessMock,
}))

import RoleAccessView from '../views/RoleAccessView.vue'

function playerResponse(name: string, playerId: string): RoleAccessResponse {
  return {
    view: ROLE_ACCESS_VIEW.PLAYER,
    assignment: {
      player: { id: playerId, name },
      role: {
        id: ROLE_ID.RENARD,
        team: TEAM.VILLAGERS,
        category: ROLE_CATEGORY.VILLAGER,
      },
      roleAccessToken: `role_${playerId.padEnd(36, '0')}`,
      bluffRoleId: null,
      specialInformation: null,
    },
  }
}

describe('RoleAccessView', () => {
  it('never commits a late response from the previous fragment token', async () => {
    let resolveFirst: (value: RoleAccessResponse) => void = () => undefined
    let resolveSecond: (value: RoleAccessResponse) => void = () => undefined
    fetchRoleAccessMock
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecond = resolve
      }))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/access', component: RoleAccessView }],
    })
    await router.push('/access#first-private-token')
    await router.isReady()
    const wrapper = mount(RoleAccessView, {
      global: { plugins: [router] },
    })
    await flushPromises()

    await router.push('/access#second-private-token')
    await flushPromises()
    resolveSecond(playerResponse('Bob', 'player_2'))
    await flushPromises()
    expect(wrapper.text()).toContain('Bob')

    resolveFirst(playerResponse('Alice', 'player_1'))
    await flushPromises()
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).not.toContain('Alice')
    wrapper.unmount()
  })
})
