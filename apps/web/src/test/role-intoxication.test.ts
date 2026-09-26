import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { ROLE_CATEGORY, ROLE_ID } from '@lgu/contracts'

import RoleInfoPanel from '../components/RoleInfoPanel.vue'
import { ROLE_DETAIL_COMPONENTS } from '../components/role-detail-components'
import { getRolePresentation } from '../constants/role-presentation'

describe('role intoxication details', () => {
    it.each(Object.keys(ROLE_DETAIL_COMPONENTS))(
        'shows role-specific intoxication guidance only for Villageois and Marginaux: %s',
        (roleId) => {
            const role = getRolePresentation(roleId)
            const component = ROLE_DETAIL_COMPONENTS[roleId]
            const wrapper = mount(component, {
                props: {
                    powerTitle: 'Votre Pouvoir',
                    infoTitle: 'Autres Infos',
                    currentRoleId: roleId,
                },
            })

            expect(role).not.toBeNull()
            expect(wrapper.find('.app-role-intoxication-section').exists()).toBe(
                role?.category === ROLE_CATEGORY.VILLAGER || role?.category === ROLE_CATEGORY.OUTSIDER,
            )
            if (role?.category === ROLE_CATEGORY.VILLAGER || role?.category === ROLE_CATEGORY.OUTSIDER) {
                expect(wrapper.find('.app-role-intoxication-section').text()).toContain(
                    "À tout moment du jeu, vous pouvez être ivre ou empoisonné(e), si c'est le cas alors",
                )
            }
        },
    )

    it('keeps the shared explanation alongside the Voyante-specific effect', () => {
        const wrapper = mount(RoleInfoPanel, {
            props: {
                roleId: ROLE_ID.VOYANTE,
                powerTitle: 'Votre Pouvoir',
                infoTitle: 'Autres Infos',
            },
        })

        expect(wrapper.text()).toContain('ces deux états ont le même effet')
        expect(wrapper.find('.app-role-intoxication-section').text()).toContain(
            'les informations sur les Loups Garous peuvent être modifiées par le Maître du Jeu',
        )
    })
})