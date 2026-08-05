import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

const getLobbyGatewayMock = vi.hoisted(() => vi.fn())
vi.mock('../services/lobby-gateway', () => ({
  GatewayTimeoutError: class GatewayTimeoutError extends Error {},
  getLobbyGateway: getLobbyGatewayMock,
}))

import App from '../App.vue'
import { ROUTE_NAME, STORAGE_KEY } from '../constants/app'
import { createAppRouter } from '../router'

describe('simulator app isolation', () => {
  it('does not construct the Socket.IO gateway on direct simulator startup', async () => {
    window.sessionStorage.setItem(STORAGE_KEY.SESSION, '{malformed')
    const removeStoredSession = vi.spyOn(Storage.prototype, 'removeItem')
    const pinia = createPinia()
    const router = createAppRouter(pinia)
    await router.push({ name: ROUTE_NAME.SIMULATOR })
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Simulateur V3')
    expect(getLobbyGatewayMock).not.toHaveBeenCalled()
    expect(removeStoredSession).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(STORAGE_KEY.SESSION)).toBe('{malformed')
    wrapper.unmount()
    window.sessionStorage.clear()
  })
})
