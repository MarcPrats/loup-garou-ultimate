import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import LobbyRoster from '../components/LobbyRoster.vue'

const host = {
  id: 'host_1',
  name: 'Le MJ',
  isHost: true,
  connected: true,
}
const player = {
  id: 'player_1',
  name: 'Marc',
  isHost: false,
  connected: true,
}

describe('LobbyRoster', () => {
  it('shows host-only kick controls and emits the selected player', async () => {
    const wrapper = mount(LobbyRoster, {
      props: {
        host,
        players: [player],
        currentPlayerId: host.id,
        canKick: true,
        kickingPlayerId: null,
      },
    })

    const kickButton = wrapper.get('button')
    expect(kickButton.text()).toBe('Expulser')
    await kickButton.trigger('click')
    expect(wrapper.emitted('kick')?.[0]).toEqual([player])

    await wrapper.setProps({ canKick: false })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})

describe('ConfirmDialog', () => {
  it('focuses cancel and exposes confirm and cancel actions', async () => {
    const wrapper = mount(ConfirmDialog, {
      attachTo: document.body,
      props: {
        title: 'Quitter ?',
        description: 'La session sera fermée.',
        confirmLabel: 'Quitter',
        destructive: true,
      },
    })
    await nextTick()

    const buttons = wrapper.findAll('button')
    expect(document.activeElement).toBe(buttons[0]!.element)
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    await buttons[0]!.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })
})
